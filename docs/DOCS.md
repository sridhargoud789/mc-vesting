## MundoCryptoVesting

MundoCryptoVesting allows the admin to set locking and vesting(known as a schedule)
period of different beneficiaries as per the tokenomics

| Token Total Supply     | 1_400_000_000              | Description                            |
| ---------------------- | -------------------------- | -------------------------------------- |
| Private Sale:          | 13% of Total Supply        | Locking: 12 Months, Vesting: 12 Months |
| Seed Sale:             | 6% of Total Supply         | Locking: 12 Months, Vesting: 24 Months |
| Foundation Treasury:   | 13% of Total Supply        | Locking: 24 Months, Vesting: 36 Months |
| Ecosystem Incentives:  | 90% of 33% of Total Supply | Locking: 0 Months , Vesting: 60 Months |
| Marketing:             | 12% of Total Supply        | Locking: 0 Months , Vesting: 36 Months |
| Advisors and Partners: | 5% of Total Supply         | Locking: 24 Months, Vesting: 36 Months |
| Team:                  | 9% of Total Supply         | Locking: 24 Months, Vesting: 36 Months |

### vestingToken

```solidity
contract IERC20 vestingToken
```

_Contract address of the token being vested_

### ADMIN_ROLE

```solidity
bytes32 ADMIN_ROLE
```

_Admin Role identifier_

### BENEFICIARY_ROLE

```solidity
bytes32 BENEFICIARY_ROLE
```

_Beneficiary Role identifier_

### ZeroAddress

```solidity
error ZeroAddress()
```

_Revert with an error when the input address is the zero address._

### OnlyAdmin

```solidity
error OnlyAdmin(address caller)
```

_Revert with an error when the caller is not the admin._

| Name   | Type    | Description                     |
| ------ | ------- | ------------------------------- |
| caller | address | The msg.sender of the function. |

### OnlyBeneficiary

```solidity
error OnlyBeneficiary(address caller)
```

_Revert with an error when the caller is not the beneficiary._

| Name   | Type    | Description                     |
| ------ | ------- | ------------------------------- |
| caller | address | The msg.sender of the function. |

### BeneficiaryAlreadyAdded

```solidity
error BeneficiaryAlreadyAdded(address beneficiary)
```

_Revert with an error when the caller is already the beneficiary._

| Name        | Type    | Description                     |
| ----------- | ------- | ------------------------------- |
| beneficiary | address | The msg.sender of the function. |

### ZeroValuedInputParam

```solidity
error ZeroValuedInputParam(string paramName)
```

_Revert with an error when the input param is zero valued._

| Name      | Type   | Description                         |
| --------- | ------ | ----------------------------------- |
| paramName | string | The parameter which is zero valued. |

### VestingSchedule

```solidity
struct VestingSchedule {
	address beneficiary;
	uint256 cliff;
	uint256 start;
	uint256 duration;
	uint256 amountTotal;
	uint256 released;
}

```

| Name        | Type    | Description                                                                                              |
| ----------- | ------- | -------------------------------------------------------------------------------------------------------- |
| beneficiary | address | The address to which tokens are allocated.                                                               |
| cliff       | uint256 | the duration where no tokens are to be released (tokens are essentially locked for that duration)        |
| start       | uint256 | The time in epoch from which the schedule will be active.                                                |
| duration    | uint256 | The period in the which the vesting it will be active (tokens are linerally vested during that duration) |
| amountTotal | uint256 | The number of total tokens that are allocated to the beneficiary.                                        |
| released    | uint256 | The number of tokens that are already released to the beneficiary.                                       |

### userVestingSchedule

```solidity
mapping(address => struct MundoCryptoVesting.VestingSchedule) userVestingSchedule
```

_Tracks the vesting schedules._

### VestingScheduleCreated

```solidity
event VestingScheduleCreated(address beneficiary, uint256 cliff, uint256 start, uint256 duration, uint256 amountTotal)
```

_Emit an event whenever a new vesting is allocated._

| Name        | Type    | Description                                            |
| ----------- | ------- | ------------------------------------------------------ |
| beneficiary | address | The beneficiary account to which vesting is allocated. |
| cliff       | uint256 | The lockup period for the tokens.                      |
| start       | uint256 | The start time for the schedule.                       |
| duration    | uint256 | The duration for which the vesting will be active.     |
| amountTotal | uint256 | The amount of tokens alloacted.                        |

### VestingReleased

```solidity
event VestingReleased(address beneficiary, uint256 amountReleased)
```

_Emit an event whenever a beneficiary claims the tokens._

| Name           | Type    | Description                                            |
| -------------- | ------- | ------------------------------------------------------ |
| beneficiary    | address | The beneficiary account to which vesting is allocated. |
| amountReleased | uint256 | The amount of tokens claimed.                          |

### onlyDefaultAdmin

```solidity
modifier onlyDefaultAdmin()
```

Ensure that the caller is the default admin.

### onlyAdmin

```solidity
modifier onlyAdmin()
```

Ensure that the caller is the admin.

### onlyBeneficiary

```solidity
modifier onlyBeneficiary()
```

Ensure that the caller is the beneficiary.

### constructor

```solidity
constructor(contract IERC20 _token) public
```

Set the ERC20 token which will be vested.

Parameters:

| Name    | Type            | Description                           |
| ------- | --------------- | ------------------------------------- |
| \_token | contract IERC20 | The ERC20 token which will be vested. |

### addVestingForBeneficicary

```solidity
function addVestingForBeneficicary(address _account, uint256 _cliff, uint256 _start, uint256 _duration, uint256 _amountTotal) external
```

_External function to assign vesting schedule to a beneficiary. Only the caller with admin role can call this function._

Parameters:

| Name          | Type    | Description                                |
| ------------- | ------- | ------------------------------------------ |
| \_account     | address | The account to allocate the vesting.       |
| \_cliff       | uint256 | The lockup duration of the tokens.         |
| \_start       | uint256 | The start time of the schedule.            |
| \_duration    | uint256 | The duration of the vesting.               |
| \_amountTotal | uint256 | The total tokens allocated to the account. |

### claimVesting

```solidity
function claimVesting() external
```

_External function to claim tokens as per the schedule. Only the caller with beneficiary role can call this function._

### userVestingDetails

```solidity
function userVestingDetails(address beneficiary) external view returns (struct MundoCryptoVesting.VestingSchedule)
```

_External view function to fetch the schedule details of a beneficiary._

Parameters:

| Name        | Type    | Description                                 |
| ----------- | ------- | ------------------------------------------- |
| beneficiary | address | The account to which schedule was assigned. |

Return Values:

| Name            | Type                                      | Description                              |
| --------------- | ----------------------------------------- | ---------------------------------------- |
| VestingSchedule | struct MundoCryptoVesting.VestingSchedule | The schedule details of the beneficiary. |

### userVestingAmount

```solidity
function userVestingAmount(address beneficiary) external view returns (uint256 vestingAmount)
```

_External view function to fetch the releasable tokens amount of a beneficiary._

Parameters:

| Name        | Type    | Description                                 |
| ----------- | ------- | ------------------------------------------- |
| beneficiary | address | The account to which schedule was assigned. |

Return Values:

| Name          | Type    | Description                                                  |
| ------------- | ------- | ------------------------------------------------------------ |
| vestingAmount | uint256 | The total number of tokens currently available for claiming. |

### addAdminRole

```solidity
function addAdminRole(address account) external
```

_External function to add admin role to an account. Only the caller with default admin role can call this function._

| Name    | Type    | Description                           |
| ------- | ------- | ------------------------------------- |
| account | address | The account to assign the admin role. |

### removeAdminRole

```solidity
function removeAdminRole(address account) external
```

_External function to remove admin role of an account. Only the caller with default admin role can call this function._

| Name    | Type    | Description                           |
| ------- | ------- | ------------------------------------- |
| account | address | The account to remove the admin role. |

### addBeneficicaryRole

```solidity
function addBeneficicaryRole(address account) public
```

_Public function to add beneficiary role to an account. Only the caller with admin role can call this function._

| Name    | Type    | Description                                 |
| ------- | ------- | ------------------------------------------- |
| account | address | The account to assign the beneficiary role. |

### isAdmin

```solidity
function isAdmin(address account) public view returns (bool isRoleAssigned)
```

_External view function to check whether an account has the admin role or not_

| Name    | Type    | Description                           |
| ------- | ------- | ------------------------------------- |
| account | address | The account to check the role status. |

Return Values:

| Name           | Type | Description                                                     |
| -------------- | ---- | --------------------------------------------------------------- |
| isRoleAssigned | bool | A boolean indicating whether the account has admin role or not. |

### isBeneficiary

```solidity
function isBeneficiary(address account) public view returns (bool isRoleAssigned)
```

_External view function to check whether an account has the beneficiary role or not_

| Name    | Type    | Description                           |
| ------- | ------- | ------------------------------------- |
| account | address | The account to check the role status. |

Return Values:

| Name           | Type | Description                                                           |
| -------------- | ---- | --------------------------------------------------------------------- |
| isRoleAssigned | bool | A boolean indicating whether the account has beneficiary role or not. |

### \_userVestingAmount

```solidity
function _userVestingAmount(address beneficiary) internal view returns (uint256 vestingAmount)
```

_Internal view function fetch the claimable token value of a beneficiary._

| Name        | Type    | Description                                |
| ----------- | ------- | ------------------------------------------ |
| beneficiary | address | The account to check the claimable tokens. |

Return Values:

| Name          | Type    | Description                                                      |
| ------------- | ------- | ---------------------------------------------------------------- |
| vestingAmount | uint256 | The total number of claimable tokens of the beneficiary account. |

### \_calcVestingForUser

```solidity
function _calcVestingForUser(struct MundoCryptoVesting.VestingSchedule m_vestingSchedule) internal view returns (uint256 vestingAmount)
```

_Internal view function calculate the total token amount of a beneficiary till date._

| Name              | Type                                      | Description                              |
| ----------------- | ----------------------------------------- | ---------------------------------------- |
| m_vestingSchedule | struct MundoCryptoVesting.VestingSchedule | The vesting schedule of the beneficiary. |

Return Values:

| Name          | Type    | Description                                                               |
| ------------- | ------- | ------------------------------------------------------------------------- |
| vestingAmount | uint256 | The total number of tokens avaiable of the beneficiary account till date. |
