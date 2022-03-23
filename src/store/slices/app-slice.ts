import { ethers } from "ethers";
import { getAddresses } from "../../constants";
import { StakingContract, MemoTokenContract, TimeTokenContract } from "../../abi";
import { setAll } from "../../helpers";
import { createSlice, createSelector, createAsyncThunk } from "@reduxjs/toolkit";
import { JsonRpcProvider } from "@ethersproject/providers";
import { getMarketPrice, getTokenPrice } from "../../helpers";
import { RootState } from "../store";
import allBonds from "../../helpers/bond";
let pancakeSwapAbi = [
    {
        name: "getAmountsOut",
        type: "function",
        inputs: [
            {
                name: "amountIn",
                type: "uint256",
            },
            { name: "path", type: "address[]" },
        ],
        outputs: [{ name: "amounts", type: "uint256[]" }],
    },
];
let tokenAbi = TimeTokenContract;
const Web3 = require("web3");

interface ILoadAppDetails {
    networkID: number;
    provider: JsonRpcProvider;
}

let pancakeSwapContract = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff".toLowerCase(); //ROUTER CHANGE THIS -------------
const web3 = new Web3("https://polygon-rpc.com/"); //CHANGE THIS -------------
async function calcSell(tokensToSell, tokenAddres) {
    const web3 = new Web3("https://polygon-rpc.com/"); //CHANGE THIS -------------
    const BNBTokenAddress = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; //WBNB CHANGE THIS -------------

    let tokenRouter = await new web3.eth.Contract(tokenAbi, tokenAddres);
    let tokenDecimals = await tokenRouter.methods.decimals().call();

    tokensToSell = setDecimals(tokensToSell, tokenDecimals);
    let amountOut;
    try {
        let router = await new web3.eth.Contract(pancakeSwapAbi, pancakeSwapContract);
        amountOut = await router.methods.getAmountsOut(tokensToSell, [tokenAddres, BNBTokenAddress]).call();
        amountOut = web3.utils.fromWei(amountOut[1]);
    } catch (error) {}

    if (!amountOut) return 0;
    return amountOut;
}
function setDecimals(number, decimals) {
    number = number.toString();
    let numberAbs = number.split(".")[0];
    let numberDecimals = number.split(".")[1] ? number.split(".")[1] : "";
    while (numberDecimals.length < decimals) {
        numberDecimals += "0";
    }
    return numberAbs + numberDecimals;
}

export const loadAppDetails = createAsyncThunk(
    "app/loadAppDetails",
    //@ts-ignore
    async ({ networkID, provider }: ILoadAppDetails) => {
        const mimPrice = getTokenPrice("MIM");
        const addresses = getAddresses(networkID);

        const stakingContract = new ethers.Contract(addresses.STAKING_ADDRESS, StakingContract, provider);
        const currentBlock = await provider.getBlockNumber();
        const currentBlockTime = (await provider.getBlock(currentBlock)).timestamp;
        const memoContract = new ethers.Contract("0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", MemoTokenContract, "https://polygon-rpc.com/");
        const timeContract = new ethers.Contract(addresses.TIME_ADDRESS, TimeTokenContract, provider);

        const usdtAddres = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; // change this with the USDT addres that you want to know the CHANGE THIS -------------
        const tokenAddres = "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39"; // change this with the Token addres that you want to know the CHANGE THIS -------------
        // Them amount of tokens to sell. adjust this value based on you need, you can encounter errors with high supply tokens when this value is 1.
        let tokens_to_sell = 1;
        let priceUSDTInBnb = (await calcSell(tokens_to_sell, usdtAddres)) / tokens_to_sell; // calculate USDT price in BNB
        let priceTokenInBnb = (await calcSell(tokens_to_sell, tokenAddres)) / tokens_to_sell; // calculate TOKEN price in BNB
        console.log("TOKEN VALUE IN BNB : " + priceTokenInBnb);
        console.log("TOKEN VALUE IN USD: " + priceTokenInBnb / priceUSDTInBnb); // convert the token price from BNB to USD based on the retrived BNB value

        const marketPrice = priceTokenInBnb / priceUSDTInBnb;

        const totalSupply = (await timeContract.totalSupply()) / Math.pow(10, 9);
        const circSupply = (await memoContract.circulatingSupply()) / Math.pow(10, 9);
        console.log("CIRCULATING SUPPLY : " + circSupply);

        const stakingTVL = circSupply * marketPrice;
        const marketCap = totalSupply * marketPrice;

        const tokenBalPromises = allBonds.map(bond => bond.getTreasuryBalance(networkID, provider));
        const tokenBalances = await Promise.all(tokenBalPromises);
        const treasuryBalance = tokenBalances.reduce((tokenBalance0, tokenBalance1) => tokenBalance0 + tokenBalance1, 0);

        const tokenAmountsPromises = allBonds.map(bond => bond.getTokenAmount(networkID, provider));
        const tokenAmounts = await Promise.all(tokenAmountsPromises);
        const rfvTreasury = tokenAmounts.reduce((tokenAmount0, tokenAmount1) => tokenAmount0 + tokenAmount1, 0);

        const timeBondsAmountsPromises = allBonds.map(bond => bond.getTimeAmount(networkID, provider));
        const timeBondsAmounts = await Promise.all(timeBondsAmountsPromises);
        const timeAmount = timeBondsAmounts.reduce((timeAmount0, timeAmount1) => timeAmount0 + timeAmount1, 0);
        const timeSupply = totalSupply - timeAmount;

        const rfv = rfvTreasury / timeSupply;

        const epoch = await stakingContract.epoch();
        const stakingReward = epoch.distribute;
        const circ = await memoContract.circulatingSupply();
        const stakingRebase = stakingReward / circ;
        const fiveDayRate = Math.pow(1 + stakingRebase, 5 * 3) - 1;
        const stakingAPY = Math.pow(1 + stakingRebase, 365 * 3) - 1;

        const currentIndex = await stakingContract.index();
        const nextRebase = epoch.endTime;

        const treasuryRunway = rfvTreasury / circSupply;
        const runway = Math.log(treasuryRunway) / Math.log(1 + stakingRebase) / 3;

        return {
            currentIndex: Number(ethers.utils.formatUnits(currentIndex, "gwei")) / 4.5,
            totalSupply,
            marketCap,
            currentBlock,
            circSupply,
            fiveDayRate,
            treasuryBalance,
            stakingAPY,
            stakingTVL,
            stakingRebase,
            marketPrice,
            currentBlockTime,
            nextRebase,
            rfv,
            runway,
        };
    },
);

const initialState = {
    loading: true,
};

export interface IAppSlice {
    loading: boolean;
    stakingTVL: number;
    marketPrice: number;
    marketCap: number;
    circSupply: number;
    currentIndex: string;
    currentBlock: number;
    currentBlockTime: number;
    fiveDayRate: number;
    treasuryBalance: number;
    stakingAPY: number;
    stakingRebase: number;
    networkID: number;
    nextRebase: number;
    totalSupply: number;
    rfv: number;
    runway: number;
}

const appSlice = createSlice({
    name: "app",
    initialState,
    reducers: {
        fetchAppSuccess(state, action) {
            setAll(state, action.payload);
        },
    },
    extraReducers: builder => {
        builder
            .addCase(loadAppDetails.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(loadAppDetails.fulfilled, (state, action) => {
                setAll(state, action.payload);
                state.loading = false;
            })
            .addCase(loadAppDetails.rejected, (state, { error }) => {
                state.loading = false;
                console.log(error);
            });
    },
});

const baseInfo = (state: RootState) => state.app;

export default appSlice.reducer;

export const { fetchAppSuccess } = appSlice.actions;

export const getAppState = createSelector(baseInfo, app => app);
