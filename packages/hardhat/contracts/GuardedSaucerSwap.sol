// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISaucerV1Router {
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);
}

/// @notice Testnet-oriented example of a non-custodial, policy-gated SaucerSwap V1 entry point.
/// @dev On Hedera, Solidity msg.value is in tinybars. An EVM wallet sends the equivalent weibars.
contract GuardedSaucerSwap {
    error InvalidConfiguration();
    error InvalidAmount();
    error QuoteExpired();
    error InvalidDeadline();
    error QuoteMoved();
    error SlippageTooWide();
    error InvalidRouterResponse();

    uint256 public constant MAX_INPUT_TINYBARS = 1_000_000_000; // 10 HBAR
    uint256 public constant MAX_QUOTE_AGE_SECONDS = 30;
    uint256 public constant MAX_DEADLINE_SECONDS = 300;
    uint256 public constant MAX_QUOTE_DRIFT_BPS = 100;
    uint256 public constant MAX_SLIPPAGE_BPS = 300;
    uint256 private constant BPS = 10_000;

    ISaucerV1Router public immutable router;
    address public immutable wrappedHbar;
    address public immutable outputToken;

    event GuardedSwapExecuted(
        address indexed trader,
        uint256 inputTinybars,
        uint256 quotedOutput,
        uint256 freshOutput,
        uint256 minimumOutput,
        uint256 actualOutput
    );

    constructor(address routerAddress, address wrappedHbarAddress, address outputTokenAddress) {
        if (
            routerAddress == address(0) ||
            wrappedHbarAddress == address(0) ||
            outputTokenAddress == address(0) ||
            wrappedHbarAddress == outputTokenAddress
        ) revert InvalidConfiguration();
        router = ISaucerV1Router(routerAddress);
        wrappedHbar = wrappedHbarAddress;
        outputToken = outputTokenAddress;
    }

    function execute(
        uint256 quotedOutput,
        uint256 minimumOutput,
        uint256 quotedAt,
        uint256 deadline
    ) external payable returns (uint256 actualOutput) {
        if (msg.value == 0 || msg.value > MAX_INPUT_TINYBARS || quotedOutput == 0 || minimumOutput == 0) {
            revert InvalidAmount();
        }
        if (quotedAt > block.timestamp || block.timestamp - quotedAt > MAX_QUOTE_AGE_SECONDS) {
            revert QuoteExpired();
        }
        if (deadline < block.timestamp || deadline > block.timestamp + MAX_DEADLINE_SECONDS) {
            revert InvalidDeadline();
        }
        if (minimumOutput < (quotedOutput * (BPS - MAX_SLIPPAGE_BPS)) / BPS) {
            revert SlippageTooWide();
        }

        address[] memory path = new address[](2);
        path[0] = wrappedHbar;
        path[1] = outputToken;
        uint256[] memory freshAmounts = router.getAmountsOut(msg.value, path);
        if (freshAmounts.length != 2 || freshAmounts[0] != msg.value || freshAmounts[1] == 0) {
            revert InvalidRouterResponse();
        }
        uint256 freshOutput = freshAmounts[1];
        if (freshOutput < (quotedOutput * (BPS - MAX_QUOTE_DRIFT_BPS)) / BPS) {
            revert QuoteMoved();
        }

        uint256[] memory result = router.swapExactETHForTokens{ value: msg.value }(
            minimumOutput,
            path,
            msg.sender,
            deadline
        );
        if (result.length != 2 || result[0] != msg.value || result[1] < minimumOutput) {
            revert InvalidRouterResponse();
        }
        actualOutput = result[1];
        emit GuardedSwapExecuted(msg.sender, msg.value, quotedOutput, freshOutput, minimumOutput, actualOutput);
    }
}
