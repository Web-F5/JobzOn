export type ElectricianAssumptions = {
  // ── GPO ──
  gpoSetupHrs:        number;
  gpoOutletSepRate:   number;
  gpoOutletOpenFrame: number;
  // ── Lighting ──
  ltDownlightHrs:     number;
  ltOtherHrs:         number;
  ltCeilingFanHrs:    number;
  ltIxlHrs:           number;
  ltExteriorDiff:     number;
  // ── New Circuit ──
  ncConnectHrs:       number;
  ncWireHrs:          number;
  // ── Switchboard ──
  sbRcboHrs:          number;
  sbNewHrs:           number;
  sbUpgradeHrs:       number;
  sbModHrs:           number;
  sbInspectorCost:    number;
  // ── Underground ──
  ugHandDigRate:      number;
  ugCablePullRate:    number;
  // ── Data/TV ──
  dtvDataNewHrs:      number;
  dtvTvNewHrs:        number;
  // ── Materials ──
  matGpoCost:         number;
  matCable25Cost:     number;
  matRcboCost:        number;
};

export const DEFAULT_ASSUMPTIONS: ElectricianAssumptions = {
  gpoSetupHrs:        0.35,
  gpoOutletSepRate:   0.55,
  gpoOutletOpenFrame: 0.28,
  ltDownlightHrs:     0.32,
  ltOtherHrs:         0.38,
  ltCeilingFanHrs:    1.00,
  ltIxlHrs:           2.00,
  ltExteriorDiff:     0.50,
  ncConnectHrs:       0.35,
  ncWireHrs:          0.25,
  sbRcboHrs:          0.15,
  sbNewHrs:           3,
  sbUpgradeHrs:       4,
  sbModHrs:           1,
  sbInspectorCost:    350,
  ugHandDigRate:      0.18,
  ugCablePullRate:    0.012,
  dtvDataNewHrs:      1.5,
  dtvTvNewHrs:        0.45,
  matGpoCost:         12,
  matCable25Cost:     1.95,
  matRcboCost:        35,
};
