import { cameraProfiles } from '../cameras.config';
import { validateProfiles } from '../src/camera/config';
import { adapterFactories } from '../src/camera/adapterRegistry';
validateProfiles(cameraProfiles);
for (const profile of cameraProfiles)
  if (!(profile.adapter in adapterFactories))
    throw new Error(`Missing adapter: ${profile.adapter}`);
console.log(`Validated ${cameraProfiles.length} camera profile(s).`);
