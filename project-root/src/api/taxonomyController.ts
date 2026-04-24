import connectors from '../taxonomy/connectors.json';
import protocols from '../taxonomy/protocols.json';
import features from '../taxonomy/features.json';
import powerProfiles from '../taxonomy/power_profiles.json';

export function getTaxonomy() {
  return {
    connectors: connectors.connectors,
    protocols: protocols.protocols,
    features: features.features,
    power_profiles: powerProfiles.power_profiles,
  };
}
