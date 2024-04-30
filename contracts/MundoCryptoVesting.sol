// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MundoCryptoVesting
 * @notice MundoCryptoVesting allows the admin to set locking and vesting(known as a schedule)
 *         period of different beneficiaries as per the tokenomics
 *         Token Total Supply:          1_000_000_000
 *         Private Sale:                13% of Total Supply             Locking: 12 Months, Vesting: 12 Months
 *         Seed Sale:                   6% of Total Supply              Locking: 12 Months, Vesting: 24 Months
 *         Foundation Treasury:         13% of Total Supply             Locking: 24 Months, Vesting: 36 Months
 *         Ecosystem Incentives:        90% of 33% of Total Supply      Locking: 0 Months , Vesting: 60 Months
 *         Marketing:                   12% of Total Supply             Locking: 0 Months , Vesting: 36 Months
 *         Advisors and Partners:       5% of Total Supply              Locking: 24 Months, Vesting: 36 Months
 *         Team:                        9% of Total Supply              Locking: 24 Months, Vesting: 36 Months
 */
contract MundoCryptoVesting is AccessControl, ReentrancyGuard {
    // using SafeERC20 library to handle token transfer.
    using SafeERC20 for IERC20;
    // Token used for vesting.
    IERC20 public immutable vestingToken;

    // defining roles for the contract.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BENEFICIARY_ROLE = keccak256("BENEFICIARY_ROLE");

    /**
     * @dev Revert with an error when the input address is the zero address.
     */
    error ZeroAddress();
    /**
     * @dev Revert with an error when the caller is not the admin.
     * @param caller The msg.sender of the function.
     */
    error OnlyAdmin(address caller);
    /**
     * @dev Revert with an error when the caller is not the beneficiary.
     * @param caller The msg.sender of the function.
     */
    error OnlyBeneficiary(address caller);
    /**
     * @dev Revert with an error when the caller is already the beneficiary.
     * @param beneficiary The msg.sender of the function.
     */
    error BeneficiaryAlreadyAdded(address beneficiary);
    /**
     * @dev Revert with an error when the input param is zero valued.
     * @param paramName The parameter which is zero valued.
     */
    error ZeroValuedInputParam(string paramName);

    /**
     * @dev A VestingSchedule specifies the beneficicary address,
     *      cliff, start, duration, amountTotal and released for
     *      a beneficiary.
     *      beneficiary: is the address to which tokens are allocated.
     *      cliff: is the duration where no tokens are to be released
     *            (tokens are essentially locked for that duration).
     *      start: is the time in epoch from which the schedule will be active.
     *      duration: is the period in the which the vesting it will be active
     *                (tokens are linerally vested during that duration)
     *      amountTotal: is the number of total tokens that are allocated to the beneficiary.
     *      released: is the number of tokens that are already released to the beneficiary.
     */
    struct VestingSchedule {
        address beneficiary;
        uint256 cliff;
        uint256 start;
        uint256 duration;
        uint256 amountTotal;
        uint256 released;
    }

    // Tracks the vesting schedules.
    mapping(address => VestingSchedule) private userVestingSchedule;

    /**
     * @dev Emit an event whenever a new vesting is allocated.
     *
     * @param beneficiary  The beneficiary account to which vesting is allocated.
     * @param cliff The lockup period for the tokens.
     * @param start The start time for the schedule.
     * @param duration The duration for which the vesting will be active.
     * @param amountTotal The amount of tokens alloacted.
     */
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 cliff,
        uint256 start,
        uint256 duration,
        uint256 amountTotal
    );
    /**
     * @dev Emit an event whenever a beneficiary claims the tokens.
     *
     * @param beneficiary  The beneficiary account to which vesting is allocated.
     * @param amountReleased The amount of tokens claimed.
     */
    event VestingReleased(address indexed beneficiary, uint256 amountReleased);

    /**
     * @notice Ensure that the caller is the default admin.
     */
    modifier onlyDefaultAdmin() {
        // check whether the caller has the DEFAULT_ADMIN_ROLE.
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            // The caller doesnot have the role, revert.
            revert OnlyAdmin(msg.sender);
        }

        // Continue with function execution.
        _;
    }

    /**
     * @notice Ensure that the caller is the admin.
     */
    modifier onlyAdmin() {
        // check whether the caller has the ADMIN_ROLE.
        if (!hasRole(ADMIN_ROLE, msg.sender)) {
            // The caller doesnot have the role, revert.
            revert OnlyAdmin(msg.sender);
        }

        // Continue with function execution.
        _;
    }

    /**
     * @notice Ensure that the caller is the beneficiary.
     */
    modifier onlyBeneficiary() {
        // check whether the caller has the BENEFICIARY_ROLE.
        if (!hasRole(BENEFICIARY_ROLE, msg.sender)) {
            // The caller doesnot have the role, revert.
            revert OnlyBeneficiary(msg.sender);
        }

        // Continue with function execution.
        _;
    }

    /**
     * @notice Set the ERC20 token which will be vested.
     * @param _token The ERC20 token which will be vested.
     */
    constructor(IERC20 _token) {
        // check whether the token is zero address or not.
        // If the address is zero, revert.
        if (address(_token) == address(0)) {
            revert ZeroAddress();
        }

        // assign the token to the immutable variable.
        vestingToken = _token;

        // assign roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(BENEFICIARY_ROLE, msg.sender);
    }

    /**
     * @dev External function to assign vesting schedule to a beneficiary.
     *       Only the caller with admin role can call this function.
     *
     * @param _account     The account to allocate the vesting.
     * @param _cliff       The lockup duration of the tokens.
     * @param _start       The start time of the schedule.
     * @param _duration    The duration of the vesting.
     * @param _amountTotal The total tokens allocated to the account.
     */
    function addVestingForBeneficicary(
        address _account,
        uint256 _cliff,
        uint256 _start,
        uint256 _duration,
        uint256 _amountTotal
    ) external onlyAdmin {
        VestingSchedule storage s_vestingSchedule = userVestingSchedule[
            _account
        ];

        // check whether the schedule is already alloacted to the account or not.
        // If set, revert.
        if (s_vestingSchedule.beneficiary != address(0)) {
            revert BeneficiaryAlreadyAdded(_account);
        }
        // check whether the _amountTotal is zero or not.
        // If zero, revert.
        if (_amountTotal == 0) {
            revert ZeroValuedInputParam("amountTotal");
        }

        // assign the values
        s_vestingSchedule.beneficiary = _account;
        s_vestingSchedule.cliff = _cliff;
        s_vestingSchedule.start = _start;
        s_vestingSchedule.duration = _duration;
        s_vestingSchedule.amountTotal = _amountTotal;

        // assign the _account the beneficiary role.
        addBeneficicaryRole(_account);

        // Emit an event indicating that a schedule has been assigned.
        emit VestingScheduleCreated(
            _account,
            _cliff,
            _start,
            _duration,
            _amountTotal
        );
    }

    /**
     * @dev External function to claim tokens as per the schedule.
     *      Only the caller with beneficiary role can call this function.
     */
    function claimVesting() external onlyBeneficiary nonReentrant {
        // fetch the total releasable tokens for the caller.
        uint256 amountToRelease = _userVestingAmount(msg.sender);

        VestingSchedule storage s_vestingSchedule = userVestingSchedule[
            msg.sender
        ];

        // update the total released tokens.
        s_vestingSchedule.released += amountToRelease;

        // Emit an event indicating that tokens have been claimed by the caller.
        emit VestingReleased(s_vestingSchedule.beneficiary, amountToRelease);

        // Transfer the ERC20 tokens.
        vestingToken.safeTransfer(msg.sender, amountToRelease);
    }

    /**
     * @dev External view function to fetch the schedule details
     *      of a beneficiary.
     *
     * @param beneficiary  The account to which schedule was assigned.
     *
     * @return VestingSchedule The schedule details of the beneficiary.
     */
    function userVestingDetails(address beneficiary)
        external
        view
        returns (VestingSchedule memory)
    {
        return userVestingSchedule[beneficiary];
    }

    /**
     * @dev External view function to fetch the releasable tokens amount
     *      of a beneficiary.
     *
     * @param beneficiary  The account to which schedule was assigned.
     *
     * @return vestingAmount The total number of tokens currently available for claiming.
     */
    function userVestingAmount(address beneficiary)
        external
        view
        returns (uint256 vestingAmount)
    {
        return _userVestingAmount(beneficiary);
    }

    /**
     * @dev External function to add admin role to an account.
     *      Only the caller with default admin role can call this function.
     *
     * @param account  The account to assign the admin role.
     */
    function addAdminRole(address account) external onlyDefaultAdmin {
        grantRole(ADMIN_ROLE, account);
    }

    /**
     * @dev External function to remove admin role of an account.
     *      Only the caller with default admin role can call this function.
     *
     * @param account  The account to remove the admin role.
     */
    function removeAdminRole(address account) external onlyDefaultAdmin {
        revokeRole(ADMIN_ROLE, account);
    }

    /**
     * @dev Public function to add beneficiary role to an account.
     *      Only the caller with admin role can call this function.
     *
     * @param account  The account to assign the beneficiary role.
     */
    function addBeneficicaryRole(address account) public onlyAdmin {
        grantRole(BENEFICIARY_ROLE, account);
    }

    /**
     * @dev External view function to check whether an account
     *      has the admin role or not
     *
     * @param account  The account to check the role status.
     *
     * @return isRoleAssigned A boolean indicating whether the account has
     *         admin role or not.
     */
    function isAdmin(address account)
        public
        view
        returns (bool isRoleAssigned)
    {
        return hasRole(ADMIN_ROLE, account);
    }

    /**
     * @dev External view function to check whether an account
     *      has the beneficiary role or not
     *
     * @param account  The account to check the role status.
     *
     * @return isRoleAssigned A boolean indicating whether the account has
     *         beneficiary role or not.
     */
    function isBeneficiary(address account)
        public
        view
        returns (bool isRoleAssigned)
    {
        return hasRole(BENEFICIARY_ROLE, account);
    }

    /**
     * @dev Internal view function fetch the claimable token value
     *      of a beneficiary.
     *
     * @param beneficiary  The account to check the claimable tokens.
     *
     * @return vestingAmount The total number of claimable tokens
     *         of the beneficiary account.
     */
    function _userVestingAmount(address beneficiary)
        internal
        view
        returns (uint256 vestingAmount)
    {
        VestingSchedule memory m_vestingSchedule = userVestingSchedule[
            beneficiary
        ];

        // fetch the releaseable amount of the beneficiary till date.
        uint256 releaseableAmount = _calcVestingForUser(m_vestingSchedule);

        // deducting already claimed tokens from total available tokens till date.
        vestingAmount = releaseableAmount > m_vestingSchedule.released
            ? releaseableAmount - m_vestingSchedule.released
            : m_vestingSchedule.released - releaseableAmount;
    }

    /**
     * @dev Internal view function calculate the total token amount
     *      of a beneficiary till date.
     *
     * @param m_vestingSchedule  The vesting schedule of the beneficiary.
     *
     * @return vestingAmount The total number of tokens avaiable
     *         of the beneficiary account till date.
     */
    function _calcVestingForUser(VestingSchedule memory m_vestingSchedule)
        internal
        view
        returns (uint256 vestingAmount)
    {
        // if the time is less than the start and cliff, return 0 as they are locked for the time period.
        if (
            block.timestamp <= m_vestingSchedule.start + m_vestingSchedule.cliff
        ) return 0;

        // if the time has completed the schedule time, return all allocated tokens.
        if (
            block.timestamp >
            m_vestingSchedule.start +
                m_vestingSchedule.cliff +
                m_vestingSchedule.duration
        ) return m_vestingSchedule.amountTotal;

        // calculate and return the vesting tokens till date.
        return
            (m_vestingSchedule.amountTotal *
                (block.timestamp -
                    (m_vestingSchedule.cliff + m_vestingSchedule.start))) /
            m_vestingSchedule.duration;
    }
}
