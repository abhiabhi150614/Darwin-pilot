"""
Wave-Aware Ship Router — Premium UI Streamlit App
Colab/Local compatible.
"""

import math
import heapq
import folium
import numpy as np
import xarray as xr
import streamlit as st
from scipy.spatial import cKDTree
from streamlit_folium import st_folium

st.set_page_config(page_title="🌊 Wave Router Premium", page_icon="🌊", layout="wide", initial_sidebar_state="collapsed")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap');
html,body,[class*="css"]{font-family:'Outfit',sans-serif;}
.stApp{background:linear-gradient(135deg,#070a13 0%,#0f172a 40%,#1e293b 100%);color:#f8fafc;}
.glass-panel {background:rgba(255,255,255,.03);border:1px solid rgba(56,189,248,.15);border-radius:24px;padding:2rem;margin-bottom:1.5rem;box-shadow:0 8px 32px rgba(0,0,0,0.2);backdrop-filter:blur(10px);}
.stButton>button{background:linear-gradient(135deg,#0284c7,#4f46e5)!important;color:white!important;border:none!important;border-radius:12px!important;font-weight:700!important;width:100%;padding:0.75rem 0!important;font-size:1.1rem!important;transition:all 0.3s ease;}
.stButton>button:hover{transform:translateY(-2px);box-shadow:0 10px 25px rgba(56,189,248,.4)!important;}
[data-testid="stSidebar"] {display: none;}
</style>
""", unsafe_allow_html=True)

NC_PATH = "cmems_with_cost.nc"
DIR_VARS = ['VMDR','VMDR_SW1','VMDR_SW2','VMDR_WW','VPED']
DIR_WEIGHTS = {"VMDR": 0.5, "VMDR_SW1": 0.2, "VMDR_SW2": 0.1, "VMDR_WW": 0.1, "VPED": 0.1}

# ─── MATH & GEOMETRY ──────────────────────────────────────────────────────────
def haversine_km(la1,lo1,la2,lo2):
    R=6371.0
    f1,f2=math.radians(la1),math.radians(la2)
    a=math.sin((f2-f1)/2)**2+math.cos(f1)*math.cos(f2)*math.sin(math.radians(lo2-lo1)/2)**2
    return 2*R*math.asin(math.sqrt(max(0,min(1,a))))

def haversine_m(la1,lo1,la2,lo2): return haversine_km(la1,lo1,la2,lo2)*1000.0

def bearing_deg(la1,lo1,la2,lo2):
    f1,f2=math.radians(la1),math.radians(la2)
    dl=math.radians(lo2-lo1)
    x=math.sin(dl)*math.cos(f2)
    y=math.cos(f1)*math.sin(f2)-math.sin(f1)*math.cos(f2)*math.cos(dl)
    return (math.degrees(math.atan2(x,y))+360.0)%360.0

def angle_diff_0_180(a_deg, b_deg):
    d = abs(a_deg - b_deg) % 360.0
    return 360.0 - d if d > 180.0 else d

def angle_to_dir_factor(relative_angle_deg):
    return float(np.interp(relative_angle_deg, [0.0, 90.0, 180.0], [0.5, 0.25, -0.2]))

def unit_sphere(lat,lon):
    lr,nr=np.radians(lat),np.radians(lon)
    return np.column_stack([np.cos(lr)*np.cos(nr),np.cos(lr)*np.sin(nr),np.sin(lr)])

def norm01(v):
    v=np.where(np.isfinite(v),v,np.nan)
    if v.size==0 or np.all(np.isnan(v)): return v
    lo,hi=np.nanpercentile(v,2),np.nanpercentile(v,98)
    if hi==lo: return np.zeros_like(v)
    return np.clip((v-lo)/(hi-lo),0,1)

def heatcolor(x):
    x=float(np.clip(x,0,1))
    r,g,b = int(255*x), int(128*(1-abs(x-0.5)*2)), int(255*(1-x))
    return f"#{r:02x}{g:02x}{b:02x}"

# ─── DATA LOADING ─────────────────────────────────────────────────────────────
@st.cache_resource(show_spinner=False)
def load_all():
    ds = xr.open_dataset(NC_PATH)
    lat_name = next((n for n in ['latitude', 'lat'] if n in ds.variables), 'latitude')
    lon_name = next((n for n in ['longitude', 'lon'] if n in ds.variables), 'longitude')
    
    lat = ds[lat_name].values.astype(float)
    lon = ds[lon_name].values.astype(float)
    
    cost_da = ds['cost']
    while cost_da.ndim > 2: cost_da = cost_da[0]
    cost = cost_da.values.astype(float)

    dir_sub = {}
    for v in DIR_VARS:
        if v in ds.variables:
            da = ds[v]
            while da.ndim > 2: da = da[0]
            dir_sub[v] = da.values.astype(float)

    lon2d, lat2d = np.meshgrid(lon, lat)
    valid_idx = np.where(np.isfinite(cost).ravel())[0]
    if valid_idx.size == 0: raise ValueError("Empty ocean grid!")
    
    lv, nv = lat2d.ravel()[valid_idx], lon2d.ravel()[valid_idx]
    kdt = cKDTree(unit_sphere(lv, nv))
    return lat, lon, lat2d, lon2d, cost, dir_sub, valid_idx, kdt

def snap_to_ocean(kdt,valid_idx,lat2d,lon2d,qlat,qlon):
    x=unit_sphere(np.array([qlat]),np.array([qlon]))
    _,i=kdt.query(x,k=1)
    fi=int(valid_idx[int(i[0])])
    nx=lat2d.shape[1]
    ri,ci=fi//nx,fi%nx
    return ri,ci,float(lat2d[ri,ci]),float(lon2d[ri,ci])

# ─── A* ALGORITHM ─────────────────────────────────────────────────────────────
def run_astar(cost2d, valid2d, lat2d_s, lon2d_s, dir_sub, s_flat, g_flat, mode="wave", min_scale=0.1, max_neg=-0.9):
    ny,nx=cost2d.shape
    getij=lambda f:(f//nx,f%nx); getf=lambda i,j:i*nx+j
    
    # Calculate global minimum for heuristic multiplier
    vc = cost2d[valid2d]
    min_cost = float(np.nanmin(vc)) if vc.size > 0 else 1e-9
    
    def heur(a,b):
        i1,j1=getij(a); i2,j2=getij(b)
        hm = haversine_m(lat2d_s[i1,j1],lon2d_s[i1,j1], lat2d_s[i2,j2],lon2d_s[i2,j2])
        return hm if mode=="distance" else hm * min_cost
        
    moves=[(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]
    g={s_flat:0.0}; prev={}
    heap=[(heur(s_flat,g_flat), 0.0, s_flat)]
    done=set()

    while heap:
        _, gc, cur = heapq.heappop(heap)
        if cur in done: continue
        if cur == g_flat:
            path=[cur]; 
            while cur in prev: cur=prev[cur]; path.append(cur)
            return list(reversed(path)), gc
            
        done.add(cur)
        ci, cj = getij(cur)
        lat_c, lon_c = float(lat2d_s[ci,cj]), float(lon2d_s[ci,cj])
        cost_c = float(cost2d[ci,cj])
        
        for di,dj in moves:
            ni,nj = ci+di, cj+dj
            if not(0<=ni<ny and 0<=nj<nx): continue
            if not valid2d[ni,nj]: continue
            nf = getf(ni,nj)
            
            lat_n, lon_n = float(lat2d_s[ni,nj]), float(lon2d_s[ni,nj])
            d_m = haversine_m(lat_c, lon_c, lat_n, lon_n)
            
            if mode == "distance":
                ec = d_m
            else:
                heading = bearing_deg(lat_c, lon_c, lat_n, lon_n)
                
                # Dynamic Directional Engine calculation
                factors_src = []
                factors_dst = []
                
                for var, w in DIR_WEIGHTS.items():
                    arr = dir_sub.get(var)
                    if arr is None: continue
                    v_src = arr[ci, cj]
                    v_dst = arr[ni, nj]
                    
                    f_src, f_dst = None, None
                    if np.isfinite(v_src): f_src = angle_to_dir_factor(angle_diff_0_180(float(v_src), heading))
                    if np.isfinite(v_dst): f_dst = angle_to_dir_factor(angle_diff_0_180(float(v_dst), heading))
                    
                    if f_src is not None and f_dst is not None:
                        factors_src.append((f_src, w)); factors_dst.append((f_dst, w))
                    elif f_src is not None:
                        factors_src.append((f_src, w)); factors_dst.append((f_src, w))
                    elif f_dst is not None:
                        factors_src.append((f_dst, w)); factors_dst.append((f_dst, w))
                
                def wavg(pairs):
                    if not pairs: return 0.0
                    vals = np.array([p[0] for p in pairs])
                    ws = np.array([p[1] for p in pairs])
                    return float(np.sum(vals * ws) / ws.sum()) if ws.sum() > 0 else float(np.nanmean(vals))
                
                f_edge = 0.5 * (wavg(factors_src) + wavg(factors_dst))
                f_edge = max(f_edge, max_neg)
                scale = max(1.0 + f_edge, min_scale)
                
                cost_n = float(cost2d[ni,nj])
                ec = 0.5 * (cost_c + cost_n) * d_m * scale * 50.0  # Massive penalty multiplier for UI scale

            tg=gc+ec
            if tg<g.get(nf,1e300):
                prev[nf]=cur; g[nf]=tg
                heapq.heappush(heap,(tg+heur(nf,g_flat), tg, nf))
    return None, float("inf")

# ─── MAP BUILDERS ──────────────────────────────────────────────────────────────
def make_select_map(lat, lon, cost_grid, origin=None, dest=None):
    m=folium.Map(location=[float(np.mean(lat)),float(np.mean(lon))], zoom_start=4, tiles="CartoDB dark_matter")
    lo2,la2=np.meshgrid(lon,lat)
    an=norm01(cost_grid)
    for i in range(0, cost_grid.shape[0], 6):
        for j in range(0, cost_grid.shape[1], 6):
            if np.isfinite(cost_grid[i,j]):
                folium.CircleMarker(
                    [float(la2[i,j]),float(lo2[i,j])],
                    radius=1.5, color=heatcolor(float(an[i,j])),
                    fill=True, fill_opacity=0.3, weight=0
                ).add_to(m)
    if origin: folium.Marker(origin,icon=folium.Icon(color="green",icon="play")).add_to(m)
    if dest: folium.Marker(dest,icon=folium.Icon(color="red",icon="flag")).add_to(m)
    return m

def make_route_map(la2s, lo2s, cost_s, dir_s, ap_d, ap_w, so, sd):
    ny,nx=cost_s.shape
    getij=lambda f:(f//nx,f%nx)
    m=folium.Map(location=[(so[0]+sd[0])/2, (so[1]+sd[1])/2], zoom_start=5, tiles="CartoDB dark_matter")
    
    an=norm01(cost_s)
    for i in range(0,ny,3):
        for j in range(0,nx,3):
            if np.isfinite(cost_s[i,j]):
                col = heatcolor(float(an[i,j]))
                htxt = f"<b>Base cost:</b> {cost_s[i,j]:.4f}<br>"
                for k, a in dir_s.items():
                    if np.isfinite(a[i,j]): htxt += f"<b>{k}:</b> {a[i,j]:.2f}<br>"
                folium.Rectangle(
                    bounds=[[float(la2s[i,j])-0.1, float(lo2s[i,j])-0.1], [float(la2s[i,j])+0.1, float(lo2s[i,j])+0.1]],
                    color=None, fill=True, fill_opacity=0.6, fill_color=col, popup=htxt, tooltip=f"Cost: {cost_s[i,j]:.2f}"
                ).add_to(m)

    if ap_d:
        coords=[(float(la2s[getij(f)[0],getij(f)[1]]), float(lo2s[getij(f)[0],getij(f)[1]])) for f in ap_d]
        folium.PolyLine(coords, color="#facc15", weight=4, opacity=0.8, tooltip="Grid Distance Path").add_to(m)

    if ap_w:
        coords=[(float(la2s[getij(f)[0],getij(f)[1]]), float(lo2s[getij(f)[0],getij(f)[1]])) for f in ap_w]
        folium.PolyLine(coords, color="#4ade80", weight=5, opacity=1.0, tooltip="AI Directional Dynamic Path").add_to(m)

    folium.Marker(so,icon=folium.Icon(color="green",icon="play")).add_to(m)
    folium.Marker(sd,icon=folium.Icon(color="red",icon="flag")).add_to(m)
    
    legend='''<div style="position:fixed;bottom:28px;left:28px;z-index:9999;
    background:rgba(15,23,42,.9);border:1px solid #334155;border-radius:12px;
    padding:14px;font-size:14px;font-family:sans-serif;color:#f8fafc;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
    <b style="font-size:16px;">Route Modalities</b><br><br>
    <span style="color:#facc15;font-weight:bold;">━━━</span> Standard Route (Grid Shortest)<br><br>
    <span style="color:#4ade80;font-weight:bold;">━━━</span> Optimal Safety (Wave AI)<br>
    </div>'''
    m.get_root().html.add_child(folium.Element(legend))
    return m

# ─── UI CONTROLLER ────────────────────────────────────────────────────────────
@st.fragment
def run_selection_ui(lat, lon, cost, kdt, vidx, lat2d, lon2d):
    st.markdown('<div class="glass-panel">', unsafe_allow_html=True)
    c1, c2 = st.columns([3, 1])
    with c1:
        st.markdown("<h2 style='margin-top:0'>🗺️ Select Journey</h2>", unsafe_allow_html=True)
        sel_map = make_select_map(lat, lon, cost, origin=st.session_state.origin, dest=st.session_state.dest)
        md = st_folium(sel_map, width="100%", height=450, returned_objects=["last_clicked"])

    if md and md.get("last_clicked"):
        clat, clon = md["last_clicked"]["lat"], md["last_clicked"]["lng"]
        ckey = (round(clat,5), round(clon,5))
        if ckey != st.session_state.last_click:
            st.session_state.last_click = ckey
            _,_,sl,sn=snap_to_ocean(kdt,vidx,lat2d,lon2d,clat,clon)
            if not st.session_state.origin: st.session_state.origin=(sl,sn)
            elif not st.session_state.dest: st.session_state.dest=(sl,sn)
            else: st.session_state.origin=(sl,sn); st.session_state.dest=None
            st.rerun()

    with c2:
        st.markdown("### 📍 Coordinates")
        st.info(f"**Origin:**<br>{f'{st.session_state.origin[0]:.2f}°, {st.session_state.origin[1]:.2f}°' if st.session_state.origin else 'Waiting...'}")
        st.error(f"**Dest:**<br>{f'{st.session_state.dest[0]:.2f}°, {st.session_state.dest[1]:.2f}°' if st.session_state.dest else 'Waiting...'}")
        if st.button("🗑️ Reset Map"):
            st.session_state.update(origin=None,dest=None,last_click=None,run_calc=False)
            st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)

def main():
    st.markdown("<center><h1 style='font-size:3.5rem;background:-webkit-linear-gradient(45deg,#38bdf8,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;'>🌊 Wave-Aware AI Router</h1></center>", unsafe_allow_html=True)
    
    try:
        lat, lon, lat2d, lon2d, cost, dir_sub, vidx, kdt = load_all()
    except Exception as e:
        st.error(f"Dataset Core Error: {e}")
        st.stop()

    for k in ["origin", "dest", "last_click", "run_calc"]:
        if k not in st.session_state: st.session_state[k] = None

    run_selection_ui(lat, lon, cost, kdt, vidx, lat2d, lon2d)

    if st.session_state.origin and st.session_state.dest:
        if st.button("🚀 ENGAGE PREDICTIVE ROUTING", use_container_width=True, type="primary"):
            st.session_state.run_calc = True

    if st.session_state.get("run_calc"):
        st.markdown("<hr style='border:1px solid #334155'>", unsafe_allow_html=True)
        with st.spinner("⚡ Running Directional Grid Search Algorithms..."):
            lo,no=st.session_state.origin; ld,nd=st.session_state.dest
            margin = 8.0
            lai=np.where((lat>=min(lo,ld)-margin)&(lat<=max(lo,ld)+margin))[0]
            loi=np.where((lon>=min(no,nd)-margin)&(lon<=max(no,nd)+margin))[0]
            if lai.size==0 or loi.size==0: st.error("No valid region found!"); st.stop()
            
            cost_s=cost[np.ix_(lai,loi)]
            valid_s=np.isfinite(cost_s)
            la2s=lat2d[np.ix_(lai,loi)]; lo2s=lon2d[np.ix_(lai,loi)]
            
            ds_sub = {k: arr[np.ix_(lai,loi)] for k, arr in dir_sub.items()}
            
            iv2=np.where(valid_s.ravel())[0]
            kdt2=cKDTree(unit_sphere(la2s.ravel()[iv2],lo2s.ravel()[iv2]))
            
            def snap2(la_,lo_): return int(iv2[int(kdt2.query(unit_sphere(np.array([la_]),np.array([lo_])),k=1)[1][0])])
            sf=snap2(lo,no); gf=snap2(ld,nd)
            nxs=cost_s.shape[1]

            so=(float(la2s.ravel()[sf]),float(lo2s.ravel()[sf]))
            sd=(float(la2s.ravel()[gf]),float(lo2s.ravel()[gf]))

            ap_d,_=run_astar(cost_s, valid_s, la2s, lo2s, ds_sub, sf, gf, mode="distance")
            ap_w,_=run_astar(cost_s, valid_s, la2s, lo2s, ds_sub, sf, gf, mode="wave")

            def get_km(ap): return sum(haversine_km(la2s[a//nxs,a%nxs],lo2s[a//nxs,a%nxs],la2s[b//nxs,b%nxs],lo2s[b//nxs,b%nxs]) for a,b in zip(ap[:-1],ap[1:])) if ap else 0
            akm_d = get_km(ap_d); akm_w = get_km(ap_w)

        st.markdown('<div class="glass-panel">', unsafe_allow_html=True)
        st.markdown("<h2>⚡ Routing Verdict</h2>", unsafe_allow_html=True)
        col1, col2 = st.columns(2)
        with col1:
            st.warning(f"#### 🟡 Standard Route (Distance)\nPhysical Path Length: **{akm_d:.0f} km**\n\n*Ignores weather direction entirely. Traverses directly through anomalies indiscriminately.*")
        with col2:
            st.success(f"#### 🟢 Optimal Route (Wave-Aware Directional)\nAdaptive Path Length: **{akm_w:.0f} km** *(+{(akm_w-akm_d):.0f} km detour)*\n\n*Actively calculates wind direction relative to heading ship velocity to circumvent severe anomalies and maximize vessel survival.*")
        
        rmap = make_route_map(la2s, lo2s, cost_s, ds_sub, ap_d, ap_w, so, sd)
        st_folium(rmap, width="100%", height=600)
        st.markdown('</div>', unsafe_allow_html=True)

if __name__=="__main__":
    main()
