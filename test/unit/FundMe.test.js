const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")

describe("FundMe", async function () {
    let fundMe
    let deployer
    let mockV3Aggregator
    const sendValue = ethers.utils.parseEther("1")
    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer,
        )
    })
    describe("constructor", async function () {
        it("sets the aggregator address correctly", async function () {
            const response = await fundMe.getPriceFeed()
            assert.equal(response, mockV3Aggregator.address)
            //assert.equal(response, await mockV3Aggregator.getAddress())
        })
    })

    describe("fund", async function () {
        it("Fails if you don't send enough ETH", async function () {
            await expect(fundMe.fund()).to.be.revertedWith(
                "You need to spend more ETH!",
            )
        })
        it("updated the amount funded data structure", async function () {
            await fundMe.fund({ value: sendValue })
            const response = await fundMe.getAddressToAmountFunded(deployer)
            assert.equal(response.toString(), sendValue.toString())
        })
        it("Adds getFunder to array", async function () {
            await fundMe.fund({ value: sendValue })
            const funder = await fundMe.getFunder(0)
            assert.equal(funder, deployer)
        })
    })
    describe("withdraw", async function () {
        this.beforeEach(async function () {
            await fundMe.fund({ value: sendValue })
        })
        it("Withdraw ETH from a single funder", async function () {
            //arrange
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address,
            )
            const startingDeployerBalance =
                await fundMe.provider.getBalance(deployer)

            //act
            const transactionResponse = await fundMe.withdraw()
            const transactionreceipt = await transactionResponse.wait(1)
            const { gasUsed, effectiveGasPrice } = transactionreceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address,
            )
            const endingDeployerBalance =
                await fundMe.provider.getBalance(deployer)
            //assert
            assert.equal(endingFundMeBalance, 0)
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString(),
            )
        })
        it("allows us to withdraw with multiple getFunder", async function () {
            //arrange
            const accounts = await ethers.getSigners()
            for (let i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i],
                )
                await fundMeConnectedContract.fund({ value: sendValue })

                const startingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address,
                )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Act
                const transactionResponse = await fundMe.withdraw()
                const transactionreceipt = await transactionResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)

                //Assert
                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address,
                )
                const endingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                assert.equal(endingFundMeBalance, 0)
                assert.equal(
                    startingFundMeBalance
                        .add(startingDeployerBalance)
                        .toString(),
                    endingDeployerBalance.add(gasCost).toString(),
                )
                // Make sure that the getFunder are reset properly
                await expect(fundMe.getFunder(0)).to.be.reverted

                /*for (i = 1; i < 6; i++) {
                    assert.equal(
                        await fundMe.getAddressToAmountFunded(
                            accounts[i].address,
                            0,
                        ),
                    )
                }*/
            }
        })
        it("Only allows the owner to withdraw", async function () {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await fundMe.connect(attacker)
            await expect(
                attackerConnectedContract.withdraw(),
            ).to.be.revertedWith("FundMe__NotOwner")
        })

        it("cheaperWithdraw testing ...", async function () {
            //arrange
            const accounts = await ethers.getSigners()
            for (let i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i],
                )
                await fundMeConnectedContract.fund({ value: sendValue })

                const startingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address,
                )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Act
                const transactionResponse = await fundMe.cheaperWithdraw()
                const transactionreceipt = await transactionResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)

                //Assert
                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address,
                )
                const endingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                assert.equal(endingFundMeBalance, 0)
                assert.equal(
                    startingFundMeBalance
                        .add(startingDeployerBalance)
                        .toString(),
                    endingDeployerBalance.add(gasCost).toString(),
                )
                // Make sure that the getFunder are reset properly
                await expect(fundMe.getFunder(0)).to.be.reverted

                /*for (i = 1; i < 6; i++) {
                    assert.equal(
                        await fundMe.getAddressToAmountFunded(
                            accounts[i].address,
                            0,
                        ),
                    )
                }*/
            }
        })
    })
})
