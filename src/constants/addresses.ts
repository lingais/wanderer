import { Networks } from "./blockchain";

const AVAX_MAINNET = {
    DAO_ADDRESS: "0x78a9e536EBdA08b5b9EDbE5785C9D1D50fA3278C",
    MEMO_ADDRESS: "0xC250e9987A032ACAC293d838726C511E6E1C029d",
    TIME_ADDRESS: "0x52A7F40BB6e9BD9183071cdBdd3A977D713F2e34",
    MIM_ADDRESS: "0xa3Fa99A148fA48D14Ed51d610c367C61876997F1",
    STAKING_ADDRESS: "0xC8B0243F350AA5F8B979b228fAe522DAFC61221a",
    STAKING_HELPER_ADDRESS: "0x76B38319483b570B4BCFeD2D35d191d3c9E01691",
    TIME_BONDING_CALC_ADDRESS: "0x651125e097D7e691f3Df5F9e5224f0181E3A4a0E",
    TREASURY_ADDRESS: "0x8ce47D56EAa1299d3e06FF3E04637449fFb01C9C",
    ZAPIN_ADDRESS: "0x9ABE63C5A2fBcd54c8bAec3553d326356a530cae", //"0xb98007C04f475022bE681a890512518052CE6104",
    WMEMO_ADDRESS: "0x0da67235dD5787D67955420C84ca1cEcd4E5Bb3b",
};

export const getAddresses = (networkID: number) => {
    if (networkID === Networks.AVAX) return AVAX_MAINNET;

    throw Error("Network don't support");
};
