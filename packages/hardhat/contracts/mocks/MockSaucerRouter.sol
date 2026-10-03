// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockSaucerRouter {
    uint256 public rate = 2;
    address public lastRecipient;
    uint256 public lastValue;

    function setRate(uint256 newRate) external {
        rate = newRate;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts) {
        require(path.length == 2, "PATH");
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn * rate;
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
    }
}
