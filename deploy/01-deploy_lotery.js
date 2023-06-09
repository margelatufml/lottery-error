const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

const VRF_SUB_MOUNT = ethers.utils.parseEther("3")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, vrfCoordinatorV2Mock, subscribtionId

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subscribtionId = transactionReceipt.events[0].args.subId
        //Fund the subscribtion
        await vrfCoordinatorV2Mock.fundSubscription(subscribtionId, VRF_SUB_MOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscribtionId = networkConfig[chainId]["subscriptionId"]
    }
    const entranceFEE = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]
    const arguments = [
        vrfCoordinatorV2Address,
        entranceFEE,
        gasLane,
        subscribtionId,
        callbackGasLimit,
        interval,
    ]
    const lottery = await deploy("lottery", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        await vrfCoordinatorV2Mock.addConsumer(subscribtionId, lottery.address)
    }
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying....")
        await verify(lottery.address, arguments)
    }

    log("_______________________")
}
module.exports.tags = ["all", "lottery"]
