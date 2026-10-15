// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// Fixed-supply ERC-20 minted at deploy: `platformBps_` of the supply to `platform_` (MirrorPad's
/// share), the rest to `owner_`. No admin, no later minting, no tax.
contract MirrorToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public immutable totalSupply;
    /// Off-chain metadata (name, image, socials), usually an ipfs:// URI.
    string public tokenURI;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 supply_,
        address owner_,
        string memory tokenURI_,
        address platform_,
        uint16 platformBps_
    ) {
        require(platformBps_ <= 1000, "MirrorToken: platform share above 10%");
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        totalSupply = supply_;
        tokenURI = tokenURI_;
        uint256 share = platform_ == address(0) ? 0 : (supply_ * platformBps_) / 10_000;
        if (share > 0) {
            balanceOf[platform_] = share;
            emit Transfer(address(0), platform_, share);
        }
        balanceOf[owner_] += supply_ - share;
        emit Transfer(address(0), owner_, supply_ - share);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= value, "ERC20: insufficient allowance");
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) private {
        require(to != address(0), "ERC20: transfer to zero address");
        uint256 bal = balanceOf[from];
        require(bal >= value, "ERC20: insufficient balance");
        unchecked {
            balanceOf[from] = bal - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }
}
