// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockSaucerRouter {
    uint256 public rate = 2;
    uint256 public rateDenominator = 1;
    uint8 public quoteMode;
    uint8 public swapMode;
    address public lastRecipient;
    uint256 public lastValue;

    function setRate(uint256 newRate) external {
        rate = newRate;
        rateDenominator = 1;
    }

    function setFractionalRate(uint256 numerator, uint256 denominator) external {
        require(denominator > 0, "DENOMINATOR");
        rate = numerator;
        rateDenominator = denominator;
    }

    function setResponseModes(uint8 newQuoteMode, uint8 newSwapMode) external {
        quoteMode = newQuoteMode;
        swapMode = newSwapMode;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts) {
        require(path.length == 2, "PATH");
        amounts = new uint256[](quoteMode == 1 ? 1 : 2);
        amounts[0] = quoteMode == 2 ? amountIn + 1 : amountIn;
        if (amounts.length == 2) amounts[1] = quoteMode == 3 ? 0 : (amountIn * rate) / rateDenominator;
    }

    function swapExactETHForTokens(
        uint256 minimumOutput,
        address[] calldata path,
        address recipient,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "EXPIRED");
        amounts = this.getAmountsOut(msg.value, path);
        require(amounts[1] >= minimumOutput, "MIN_OUTPUT");
        lastRecipient = recipient;
        lastValue = msg.value;
        if (swapMode == 1) {
            amounts = new uint256[](1);
            amounts[0] = msg.value;
        } else if (swapMode == 2) {
            amounts[0] += 1;
        } else if (swapMode == 3) {
            amounts[1] = minimumOutput - 1;
        }
    }
}
