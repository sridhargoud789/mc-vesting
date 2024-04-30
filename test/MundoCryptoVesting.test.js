const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers, network } = require('hardhat')

let accounts,
	owner,
	alice,
	bob,
	privateSaleUser,
	seedSaleUser,
	foundationTreasuryUser,
	ecosystemIncentivesUser,
	marketingUser,
	advisoryPartnerUser,
	teamUser,
	mockToken,
	vestingContract

const now = async () => (await ethers.provider.getBlock('latest')).timestamp

const SecondsInOneMonth = 2629743
const tokenTotalSupply = BigNumber.from(1_000_000_000).mul(
	BigNumber.from(10).pow(18)
)

const dummyTimeLockData = SecondsInOneMonth
const dummyVestingData = SecondsInOneMonth / 3
const dummyTokenData = tokenTotalSupply.mul(1).div(100)

const privateSaleLockDurationInSec = 12 * SecondsInOneMonth
const privateSaleVestingDurationInSec = 12 * SecondsInOneMonth
const privateSaleUserAllocation = tokenTotalSupply.mul(13).div(100)

const seedSaleLockDurationInSec = 12 * SecondsInOneMonth
const seedSaleVestingDurationInSec = 24 * SecondsInOneMonth
const seedSaleUserAllocation = tokenTotalSupply.mul(6).div(100)

const foundationTreasuryLockDurationInSec = 24 * SecondsInOneMonth
const foundationTreasuryVestingDurationInSec = 36 * SecondsInOneMonth
const foundationTreasuryUserAllocation = tokenTotalSupply.mul(13).div(100)

const ecosystemIncentivesLockDurationInSec = 0
const ecosystemIncentivesVestingDurationInSec = 60 * SecondsInOneMonth
const ecosystemIncentivesUserAllocation = tokenTotalSupply
	.mul(33)
	.div(100)
	.mul(90)
	.div(100)

const marketingLockDurationInSec = 0
const marketingVestingDurationInSec = 36 * SecondsInOneMonth
const marketingUserAllocation = tokenTotalSupply.mul(12).div(100)

const advisoryPartnerLockDurationInSec = 24 * SecondsInOneMonth
const advisoryPartnerVestingDurationInSec = 36 * SecondsInOneMonth
const advisoryPartnerSaleUserAllocation = tokenTotalSupply.mul(5).div(100)

const teamLockDurationInSec = 24 * SecondsInOneMonth
const teamVestingDurationInSec = 36 * SecondsInOneMonth
const teamUserAllocation = tokenTotalSupply.mul(9).div(100)

const totalTokensForVesting = privateSaleUserAllocation
	.add(seedSaleUserAllocation)
	.add(foundationTreasuryUserAllocation)
	.add(ecosystemIncentivesUserAllocation)
	.add(ecosystemIncentivesUserAllocation)
	.add(marketingUserAllocation)
	.add(advisoryPartnerSaleUserAllocation)
	.add(teamUserAllocation)

const dataToTest = [
	{
		name: 'PrivateSale',
		userAcc: 'privateSaleUser',
		lock: privateSaleLockDurationInSec,
		vesting: privateSaleVestingDurationInSec,
		amount: privateSaleUserAllocation,
	},
	{
		name: 'SeedSale',
		userAcc: 'privateSaleUser',
		lock: seedSaleLockDurationInSec,
		vesting: seedSaleVestingDurationInSec,
		amount: seedSaleUserAllocation,
	},
	{
		name: 'FoundationTreasury',
		userAcc: 'foundationTreasuryUser',
		lock: foundationTreasuryLockDurationInSec,
		vesting: foundationTreasuryVestingDurationInSec,
		amount: foundationTreasuryUserAllocation,
	},
	{
		name: 'EcosystemIncentives',
		userAcc: 'ecosystemIncentivesUser',
		lock: ecosystemIncentivesLockDurationInSec,
		vesting: ecosystemIncentivesVestingDurationInSec,
		amount: ecosystemIncentivesUserAllocation,
	},
	{
		name: 'Marketing',
		userAcc: 'marketingUser',
		lock: marketingLockDurationInSec,
		vesting: marketingVestingDurationInSec,
		amount: marketingUserAllocation,
	},
	{
		name: 'Advisory And Partners',
		userAcc: 'advisoryPartnerUser',
		lock: advisoryPartnerLockDurationInSec,
		vesting: advisoryPartnerVestingDurationInSec,
		amount: advisoryPartnerSaleUserAllocation,
	},
	{
		name: 'Team',
		userAcc: 'teamUser',
		lock: teamLockDurationInSec,
		vesting: teamVestingDurationInSec,
		amount: teamUserAllocation,
	},
]

const timeToTest = [
	SecondsInOneMonth / 3,
	SecondsInOneMonth,
	13 * SecondsInOneMonth,
	20 * SecondsInOneMonth,
	27 * SecondsInOneMonth,
	35 * SecondsInOneMonth,
	42 * SecondsInOneMonth,
	55 * SecondsInOneMonth,
	62 * SecondsInOneMonth,
]

const increaseTimeAndMineBlock = async (duration) => {
	await network.provider.send('evm_increaseTime', [duration])
	await network.provider.send('evm_mine')
}

const testFetchTimeVesting = async (idx, numOfSecs, start) => {
	const { amount, lock, vesting } = dataToTest[idx]

	const duration = numOfSecs

	await increaseTimeAndMineBlock(duration)

	const vestedTokens = await vestingContract.userVestingAmount(
		accounts[idx + 3].address
	)

	if ((await now()) <= start + lock) {
		expect(vestedTokens).to.be.equal(0)

		return { vestedTokens }
	}

	if ((await now()) >= start + lock + vesting) {
		expect(vestedTokens).to.be.equal(amount)

		return { vestedTokens }
	} else {
		const lowerLimit = amount
			.mul((await now()) - (start + lock))
			.div(vesting)
		// buffer of 2 seconds due to blocks being mined at
		// different time.
		const upperLimit = amount
			.mul((await now()) - (start + lock) + 2)
			.div(vesting)

		expect(vestedTokens).to.be.gte(lowerLimit).lte(upperLimit)

		return { vestedTokens, lowerLimit, upperLimit }
	}
}

const testClaimTimeVesting = async (idx, numOfSecs, start) => {
	const { vestedTokens, lowerLimit, upperLimit } = await testFetchTimeVesting(
		idx,
		numOfSecs,
		start
	)

	await vestingContract.connect(accounts[idx + 3]).claimVesting()

	await network.provider.send('evm_mine')

	const details = await vestingContract.userVestingDetails(
		accounts[idx + 3].address
	)

	if (lowerLimit && upperLimit)
		expect(details.released).to.be.gte(lowerLimit).lte(upperLimit)
	else expect(details.released).to.be.eq(vestedTokens)
}

describe('MundoCryptoVesting', () => {
	beforeEach(async () => {
		accounts = await ethers.getSigners()
		owner = accounts[0]
		alice = accounts[1]
		bob = accounts[2]
		privateSaleUser = accounts[3]
		seedSaleUser = accounts[4]
		foundationTreasuryUser = accounts[5]
		ecosystemIncentivesUser = accounts[6]
		advisoryPartnerUser = accounts[7]
		marketingUser = accounts[8]
		teamUser = accounts[9]

		const mockTokenContractFactory = await ethers.getContractFactory(
			'MockToken'
		)
		mockToken = await mockTokenContractFactory.deploy()

		const vestingContractFactory = await ethers.getContractFactory(
			'MundoCryptoVesting'
		)
		vestingContract = await vestingContractFactory.deploy(mockToken.address)

		await mockToken
			.connect(owner)
			.mint(vestingContract.address, totalTokensForVesting)
	})

	describe('Deployment', () => {
		it("won't deploy if the token address is zero address", async () => {
			const vestingContractFactory = await ethers.getContractFactory(
				'MundoCryptoVesting'
			)

			await expect(
				vestingContractFactory.deploy(ethers.constants.AddressZero)
			).to.be.revertedWith('ZeroAddress')
		})

		it('will deploy with proper data', async () => {
			expect(await vestingContract.vestingToken()).to.be.equal(
				mockToken.address
			)
			expect(await vestingContract.isAdmin(owner.address)).to.be.equal(
				true
			)
			expect(
				await vestingContract.isBeneficiary(owner.address)
			).to.be.equal(true)
		})
	})

	describe('Roles', () => {
		it('will allow the default admin to add new admins', async () => {
			await vestingContract.connect(owner).addAdminRole(alice.address)

			expect(await vestingContract.isAdmin(alice.address)).to.be.equal(
				true
			)
		})

		it('will allow not allow admin to add new admins', async () => {
			await vestingContract.connect(owner).addAdminRole(alice.address)

			await expect(
				vestingContract.connect(alice).addAdminRole(bob.address)
			).to.be.revertedWith('OnlyAdmin')
		})

		it('will allow not allow users to add new admins', async () => {
			await expect(
				vestingContract.connect(alice).addAdminRole(bob.address)
			).to.be.revertedWith('OnlyAdmin')
		})

		it('will allow the admin to add new beneficiaries', async () => {
			await vestingContract
				.connect(owner)
				.addBeneficicaryRole(alice.address)

			expect(
				await vestingContract.isBeneficiary(alice.address)
			).to.be.equal(true)
		})

		it('will allow not allow beneficiaries to add new beneficiaries', async () => {
			await vestingContract
				.connect(owner)
				.addBeneficicaryRole(alice.address)

			await expect(
				vestingContract.connect(alice).addBeneficicaryRole(bob.address)
			).to.be.revertedWith('OnlyAdmin')
		})

		it('will allow not allow users to add new beneficiaries', async () => {
			await expect(
				vestingContract.connect(alice).addBeneficicaryRole(bob.address)
			).to.be.revertedWith('OnlyAdmin')
		})

		it('will allow the default admin to remove admins', async () => {
			await vestingContract.connect(owner).addAdminRole(alice.address)

			await vestingContract.connect(owner).removeAdminRole(alice.address)

			expect(await vestingContract.isAdmin(alice.address)).to.be.equal(
				false
			)
		})

		it('will allow not allow admin to remove admins', async () => {
			await vestingContract.connect(owner).addAdminRole(alice.address)
			await vestingContract.connect(owner).addAdminRole(bob.address)

			await expect(
				vestingContract.connect(alice).removeAdminRole(bob.address)
			).to.be.revertedWith('OnlyAdmin')
		})

		it('will allow not allow users to remove admins', async () => {
			await expect(
				vestingContract.connect(alice).removeAdminRole(bob.address)
			).to.be.revertedWith('OnlyAdmin')
		})
	})

	describe('Common Vesting Functions', () => {
		describe('Create Vesting', () => {
			it('will allow admin users to create vesting', async () => {
				const startTime = await now()

				await vestingContract
					.connect(owner)
					.addVestingForBeneficicary(
						bob.address,
						dummyTimeLockData,
						startTime,
						dummyVestingData,
						dummyTokenData
					)

				const userVestingDetails =
					await vestingContract.userVestingDetails(bob.address)

				expect(userVestingDetails.beneficiary).to.be.equal(bob.address)
				expect(userVestingDetails.cliff).to.be.equal(dummyTimeLockData)
				expect(userVestingDetails.start).to.be.equal(startTime)
				expect(userVestingDetails.duration).to.be.equal(
					dummyVestingData
				)
				expect(userVestingDetails.amountTotal).to.be.equal(
					dummyTokenData
				)
				expect(
					await vestingContract.isBeneficiary(bob.address)
				).to.be.equal(true)
			})

			it('will not allow non admin users to create vesting', async () => {
				await expect(
					vestingContract
						.connect(bob)
						.addVestingForBeneficicary(
							bob.address,
							dummyTimeLockData,
							await now(),
							dummyVestingData,
							dummyTokenData
						)
				).to.be.revertedWith('OnlyAdmin')
			})

			it('will revert if the token allocation is zero', async () => {
				await expect(
					vestingContract
						.connect(owner)
						.addVestingForBeneficicary(
							bob.address,
							dummyTimeLockData,
							await now(),
							dummyVestingData,
							0
						)
				).to.be.revertedWith('ZeroValuedInputParam("amountTotal")')
			})

			it('will revert if the beneficiary is already added', async () => {
				const startTime = await now()

				await vestingContract
					.connect(owner)
					.addVestingForBeneficicary(
						teamUser.address,
						dataToTest[0].lock,
						startTime,
						dataToTest[0].vesting,
						dataToTest[0].amount
					)

				await expect(
					vestingContract
						.connect(owner)
						.addVestingForBeneficicary(
							teamUser.address,
							dataToTest[0].lock,
							startTime,
							dataToTest[0].vesting,
							dataToTest[0].amount
						)
				).to.be.revertedWith('BeneficiaryAlreadyAdded')
			})

			it('will emit an event for vesting created', async () => {
				const startTime = await now()

				const tx = await vestingContract
					.connect(owner)
					.addVestingForBeneficicary(
						teamUser.address,
						dataToTest[0].lock,
						startTime,
						dataToTest[0].vesting,
						dataToTest[0].amount
					)

				expect(tx)
					.to.emit(vestingContract, 'VestingScheduleCreated')
					.withArgs(
						teamUser.address,
						dataToTest[0].lock,
						startTime,
						dataToTest[0].vesting,
						dataToTest[0].amount
					)
			})
		})

		dataToTest.forEach((ele, idx) => {
			describe(`Fetch Vesting Info for ${ele.name}`, () => {
				for (let i = 0; i < timeToTest.length; i++) {
					const time = timeToTest[i]

					it(`will fetch proper vesting tokens for ${
						time / SecondsInOneMonth
					} months`, async () => {
						ele.user = accounts[idx + 3]

						const startTime = await now()

						await vestingContract
							.connect(owner)
							.addVestingForBeneficicary(
								ele.user.address,
								ele.lock,
								startTime,
								ele.vesting,
								ele.amount
							)

						await testFetchTimeVesting(idx, time, startTime)
					})
				}
			})
		})

		describe('Claim Vesting', () => {
			it("won't allow anyone to claim tokens of other users", async () => {
				await vestingContract
					.connect(owner)
					.addVestingForBeneficicary(
						bob.address,
						dummyTimeLockData,
						await now(),
						dummyVestingData,
						dummyTokenData
					)

				await expect(
					vestingContract.connect(alice).claimVesting()
				).to.be.revertedWith('OnlyBeneficiary')
			})

			it("won't allow anyone to claim already claimed tokens", async () => {
				// used to send multiple txs in same block
				// otherwise, the time increases and there are
				// some tokens available for claiming
				await network.provider.send('evm_setAutomine', [false])

				await vestingContract
					.connect(owner)
					.addVestingForBeneficicary(
						bob.address,
						dummyTimeLockData,
						await now(),
						dummyVestingData,
						dummyTokenData
					)

				await increaseTimeAndMineBlock(SecondsInOneMonth)

				await vestingContract.connect(bob).claimVesting()

				await expect(() =>
					vestingContract.connect(bob).claimVesting()
				).to.changeTokenBalances(
					mockToken,
					[bob, vestingContract],
					[BigNumber.from(0), BigNumber.from(0).mul(-1)]
				)

				await network.provider.send('evm_setAutomine', [true])
			})
		})
	})

	dataToTest.forEach((ele, idx) => {
		describe(`Vesting Functions for ${ele.name}`, () => {
			describe('Create Vesting', () => {
				it('will allow the admin to create the vesting with proper details', async () => {
					ele.user = accounts[idx + 3]

					const startTime = await now()

					await vestingContract
						.connect(owner)
						.addVestingForBeneficicary(
							ele.user.address,
							ele.lock,
							startTime,
							ele.vesting,
							ele.amount
						)

					const userVestingDetails =
						await vestingContract.userVestingDetails(
							ele.user.address
						)

					expect(userVestingDetails.beneficiary).to.be.equal(
						ele.user.address
					)
					expect(userVestingDetails.cliff).to.be.equal(ele.lock)
					expect(userVestingDetails.start).to.be.equal(startTime)
					expect(userVestingDetails.duration).to.be.equal(ele.vesting)
					expect(userVestingDetails.amountTotal).to.be.equal(
						ele.amount
					)
					expect(
						await vestingContract.isBeneficiary(ele.user.address)
					).to.be.equal(true)
				})
			})

			describe('Fetch Vesting Info', () => {
				it('will fetch correct claimable vesting amount for before start time', async () => {
					ele.user = accounts[idx + 3]

					const startTime = (await now()) + 86400

					await vestingContract
						.connect(owner)
						.addVestingForBeneficicary(
							ele.user.address,
							ele.lock,
							startTime,
							ele.vesting,
							ele.amount
						)

					expect(
						await vestingContract.userVestingAmount(
							ele.user.address
						)
					).to.be.equal(0)
				})

				it('will fetch correct claimable vesting amount for cliff period', async () => {
					ele.user = accounts[idx + 3]

					const startTime = await now()

					await vestingContract
						.connect(owner)
						.addVestingForBeneficicary(
							ele.user.address,
							ele.lock,
							startTime,
							ele.vesting,
							ele.amount
						)

					// if there is no cliff, no need to check
					if (ele.lock === 0) expect(true)
					else {
						await network.provider.send('evm_increaseTime', [
							ele.lock - 86400,
						])
						await network.provider.send('evm_mine')

						expect(
							await vestingContract.userVestingAmount(
								ele.user.address
							)
						).to.be.equal(0)
					}
				})

				it('will fetch correct claimable vesting amount for after the end', async () => {
					ele.user = accounts[idx + 3]

					const startTime = await now()

					await vestingContract
						.connect(owner)
						.addVestingForBeneficicary(
							ele.user.address,
							ele.lock,
							startTime,
							ele.vesting,
							ele.amount
						)

					await network.provider.send('evm_increaseTime', [
						1200 * SecondsInOneMonth,
					])
					await network.provider.send('evm_mine')

					expect(
						await vestingContract.userVestingAmount(
							ele.user.address
						)
					).to.be.equal(ele.amount)
				})
			})

			describe('Claim Vesting', () => {
				for (let i = 0; i < timeToTest.length; i++) {
					const time = timeToTest[i]

					it(`will claim proper vesting tokens for ${
						time / SecondsInOneMonth
					} months`, async () => {
						await network.provider.send('evm_setAutomine', [false])

						ele.user = accounts[idx + 3]

						const startTime = await now()

						await vestingContract
							.connect(owner)
							.addVestingForBeneficicary(
								ele.user.address,
								ele.lock,
								startTime,
								ele.vesting,
								ele.amount
							)

						await testClaimTimeVesting(idx, time, startTime)

						await network.provider.send('evm_setAutomine', [true])
						await network.provider.send('evm_mine')
					})
				}
			})
		})
	})
})
