import numpy as np

file_path = "wave_router_app.py"

with open(file_path, "r", encoding="utf-8") as f:
    orig = f.read()

idx = orig.find("# ─── MAIN ────────────────────────────────────────────────────────────────────────")

new_main = """# ─── MAIN ────────────────────────────────────────────────────────────────────────
def main():
    st.title("🌊 Wave-Aware Ship Router")
    st.markdown("### Click the map to set your points")
    st.write("1st Click = Source | 2nd Click = Destination")

    ov,gs,rgs,dw_raw,diag,margin=sidebar()

    with st.spinner("Loading CMEMS Wave Physics Data…"):
        try:
            lat,lon,lat2d,lon2d,raw,cost,vidx,kdt=load_all()
        except Exception as e:
            st.error(f"❌ Cannot load NC file: {e}")
            st.stop()

    for k,v in [("origin",None),("dest",None),("result",None),("last_click",None)]:
        if k not in st.session_state: st.session_state[k]=v
        
    # Always display interactive map first
    sel_map = make_select_map(lat, lon, raw, overlay=ov, step=gs, 
                              origin=st.session_state.origin, dest=st.session_state.dest)
    
    md = st_folium(sel_map, width="100%", height=500, returned_objects=["last_clicked"])

    # Handle map clicks simply
    if md and md.get("last_clicked"):
        clat=md["last_clicked"]["lat"]
        clon=md["last_clicked"]["lng"]
        click_key=(round(clat,5),round(clon,5))
        
        if click_key != st.session_state.last_click:
            st.session_state.last_click=click_key
            _,_,sl,sn=snap_to_ocean(kdt,vidx,lat2d,lon2d,clat,clon)
            
            if st.session_state.origin is None:
                st.session_state.origin=(sl,sn)
                st.session_state.result=None
            elif st.session_state.dest is None:
                st.session_state.dest=(sl,sn)
                st.session_state.result=None
            else:
                # If they click again after both are set, start over implicitly
                st.session_state.origin=(sl,sn)
                st.session_state.dest=None
                st.session_state.result=None
            
            st.rerun()

    # Show coordinates
    c1, c2, c3 = st.columns(3)
    o_str = f"{st.session_state.origin[0]:.2f}°, {st.session_state.origin[1]:.2f}°" if st.session_state.origin else "Not selected"
    d_str = f"{st.session_state.dest[0]:.2f}°, {st.session_state.dest[1]:.2f}°" if st.session_state.dest else "Not selected"
    
    c1.info(f"📍 Source: {o_str}")
    c2.info(f"🚩 Destination: {d_str}")
    if c3.button("🗑️ Clear Map"):
        st.session_state.update(origin=None,dest=None,result=None,last_click=None)
        st.rerun()

    # Process Route
    if st.session_state.origin and st.session_state.dest:
        if st.button("Calculate Best Route", use_container_width=True, type="primary"):
            with st.spinner("Finding safest path to avoid severe waves..."):
                orig=st.session_state.origin; dst=st.session_state.dest
                lo,no=orig; ld,nd=dst
                
                lamin=min(lo,ld)-margin; lamax=max(lo,ld)+margin
                lomin=min(no,nd)-margin; lomax=max(no,nd)+margin
                lai=np.where((lat>=lamin)&(lat<=lamax))[0]
                loi=np.where((lon>=lomin)&(lon<=lomax))[0]
                
                if lai.size==0 or loi.size==0:
                    st.error("Region empty — increase margin."); st.stop()

                cost_s=cost[np.ix_(lai,loi)]
                valid_s=np.isfinite(cost_s)
                las=lat[lai]; los=lon[loi]
                lo2s,la2s=np.meshgrid(los,las)

                dir_s={}
                for v in DIR_VARS:
                    if v in raw:
                        try: dir_s[v]=raw[v][np.ix_(lai,loi)]
                        except: pass

                tw=sum(dw_raw.get(k,0) for k in dir_s)
                dw_n={k:dw_raw.get(k,0)/tw for k in dir_s} if tw>0 else {k:1/len(dir_s) for k in dir_s} if dir_s else {}

                iv2=np.where(valid_s.ravel())[0]
                if iv2.size==0: st.error("No ocean cells in region."); st.stop()
                lv2=la2s.ravel()[iv2]; nv2=lo2s.ravel()[iv2]
                kdt2=cKDTree(unit_sphere(lv2,nv2))

                def snap2(la,lo_):
                    x=unit_sphere(np.array([la]),np.array([lo_]))
                    _,i=kdt2.query(x,k=1)
                    return int(iv2[int(i[0])])

                sf=snap2(lo,no); gf=snap2(ld,nd)
                nxs=cost_s.shape[1]
                so=(float(la2s.ravel()[sf]),float(lo2s.ravel()[sf]))
                sd=(float(la2s.ravel()[gf]),float(lo2s.ravel()[gf]))

                gcp=gc_waypoints(so[0],so[1],sd[0],sd[1],n=80)
                gckm=route_km(gcp)

                try:
                    ap,ac=run_astar(cost_s,valid_s,la2s,lo2s,dir_s,dw_n,sf,gf,allow_diag=diag)
                    if ap is None: akm=None
                    else: akm=sum(haversine_km(
                            float(la2s[a//nxs,a%nxs]),float(lo2s[a//nxs,a%nxs]),
                            float(la2s[b//nxs,b%nxs]),float(lo2s[b//nxs,b%nxs])
                        ) for a,b in zip(ap[:-1],ap[1:]))
                except Exception as ex:
                    ap=None; akm=None; ac=None

                st.session_state.result={
                    "orig":orig,"dst":dst,
                    "cost_s":cost_s,"valid_s":valid_s,
                    "la2s":la2s,"lo2s":lo2s,"las":las,"los":los,
                    "dir_s":dir_s,"gcp":gcp,"gckm":gckm,
                    "ap":ap,"akm":akm,"ac":ac,"so":so,"sd":sd,"nxs":nxs,
                }
            st.rerun()

    # Results Section
    if st.session_state.result:
        res=st.session_state.result
        st.divider()
        st.subheader("📊 Route Results")
        
        gckm=res["gckm"]; akm=res.get("akm")
        
        r1, r2 = st.columns(2)
        with r1:
            st.markdown(f"**⚪ Normal Route (Straight Line):** {gckm:.0f} km")
            st.caption("Ignores all wave and weather conditions.")
            
        with r2:
            if akm:
                diff=akm-gckm; dp=100*diff/gckm
                st.markdown(f"**🟢 Dynamic Route (A* Optimized):** {akm:.0f} km")
                st.caption(f"Adds {diff:.0f}km (+{dp:.1f}%) to bypass severe wave systems safely.")
            else:
                st.error("Dynamic Route failed: Could not find path.")

        # Print the NC file values directly as requested
        st.markdown("#### 🌊 Weather Data Extracted from `.nc` File")
        if res["ap"]:
            ap=res["ap"]; nxs=res["nxs"]
            # Sample max 15 points to keep the table readable
            step2=max(1,len(ap)//15) 
            rows=[]
            for f in ap[::step2]:
                ii,jj=f//nxs,f%nxs
                row={"Latitude":f"{res['la2s'][ii,jj]:.3f}",
                     "Longitude":f"{res['lo2s'][ii,jj]:.3f}",
                     "A* Calculated Cost":f"{res['cost_s'][ii,jj]:.4f}"}
                for v in list(res["dir_s"]):
                    val=res["dir_s"][v][ii,jj]
                    row[v]=f"{val:.2f}" if np.isfinite(val) else "—"
                rows.append(row)
            st.dataframe(pd.DataFrame(rows), use_container_width=True)

        st.markdown("### 🗺️ Visual Route Comparison")
        st.caption("🔵 dashed = Normal Straight Route | 🟢 solid = Dynamic Route (A*)")
        
        rmap = make_route_map(res["las"],res["los"],res["la2s"],res["lo2s"],
                              res["cost_s"],res["valid_s"],res["dir_s"],
                              res["gcp"],res["ap"],res["so"],res["sd"],step=rgs)
        st_folium(rmap,width="100%",height=500)

if __name__=="__main__":
    main()
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.write(orig[:idx] + new_main)

print("Update successful!")
