import xarray as xr
import numpy as np
import os

path = "cmems_mod_glo_wav_my_0.2deg_PT3H-i_1754888835779 (1).nc"
print(f"Loading {path}...")
ds = xr.open_dataset(path)

weights = {
    "VHM0": 0.25,
    "VHM0_SW1": 0.15,
    "VHM0_SW2": 0.05,
    "VHM0_WW": 0.15,
    "VTM01_SW1": 0.05,
    "VTM01_SW2": 0.05,
    "VTM01_WW": 0.05,
    "VTM10": 0.05,
    "VTM02": 0.05,
    "VTPK": 0.05,
    "VSDX": 0.025,
    "VSDY": 0.025
}

norm_vars = {}
for var, w in weights.items():
    if var in ds.variables:
        vals = ds[var]
        min_v = float(vals.min())
        max_v = float(vals.max())
        norm_vars[var] = (vals - min_v) / (max_v - min_v + 1e-9)

# Weighted sum for cost
print("Calculating Base Cost Function...")
cost = sum(weights[var] * norm_vars[var] for var in norm_vars)

# Mask out land where VHM0 is NaN
cost = xr.where(np.isnan(ds["VHM0"]), np.nan, cost)

ds["cost"] = cost
ds["cost"].attrs["units"] = "dimensionless"
ds["cost"].attrs["description"] = "Weighted normalized cost from non-directional variables"

output_path = "cmems_with_cost.nc"
print(f"Saving to {output_path}...")
ds.to_netcdf(output_path)
print("Saved!")
