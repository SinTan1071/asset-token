// Copyright (c) 2017 Clearmatics Technologies Ltd

// SPDX-License-Identifier: LGPL-3.0+
const { TestHelper } = require("zos"); //function to retrieve zos project structure object
const { Contracts, ZWeb3 } = require("zos-lib"); //to retrieve compiled contract artifacts

const { singletons } = require("openzeppelin-test-helpers");

ZWeb3.initialize(web3.currentProvider);

const AssetToken = Contracts.getFromLocal("AssetToken");

let CONTRACT;

contract("Asset Token", accounts => {
  const addrOwner = accounts[0];
  const proxyOwner = accounts[1];
  const data = web3.utils.randomHex(0);
  beforeEach(async () => {
    this.erc1820 = await singletons.ERC1820Registry(addrOwner);

    PROJECT = await TestHelper({ from: proxyOwner });

    //contains logic contract
    PROXY = await PROJECT.createProxy(AssetToken, {
      initMethod: "initialize",
      initArgs: ["CLR", "Asset Token", addrOwner, [], 0, 1]
    });

    CONTRACT = PROXY.methods;
  });

  describe("Emergency Stop Operations", () => {
    context("Emergency Switch", () => {
      it("attempt to Fund when trading is deactivated", async () => {
        const addrRecipient = accounts[2];

        const totalSupplyBefore = await CONTRACT.totalSupply().call();
        const balanceRecipientBefore = await CONTRACT.balanceOf(
          addrRecipient
        ).call();

        await CONTRACT.emergencyStop().send({ from: addrOwner });
        const status = await CONTRACT.getTradingStatus().call();
        assert.equal(status, false);

        let actualError = null;
        try {
          const fundVal = 100;
          const fundRes = await CONTRACT.fund(addrRecipient, fundVal).send({
            from: addrOwner
          });
        } catch (error) {
          actualError = error;
        }

        const totalSupplyAfter = await CONTRACT.totalSupply().call();
        const balanceRecipientAfter = await CONTRACT.balanceOf(
          addrRecipient
        ).call();

        assert.strictEqual(totalSupplyBefore, totalSupplyAfter);
        assert.strictEqual(balanceRecipientBefore, balanceRecipientAfter);
        assert.strictEqual(
          actualError.toString(),
          "Error: Returned error: VM Exception while processing transaction: revert Contract emergency stop is activated"
        );
      });

      it("attempt to Defund when trading is deactivated", async () => {
        const totalSupplyBefore = await CONTRACT.totalSupply().call();
        const balanceRecipientBefore = await CONTRACT.balanceOf(
          addrOwner
        ).call();

        await CONTRACT.emergencyStop().send({ from: addrOwner });
        const status = await CONTRACT.getTradingStatus().call();
        assert.equal(status, false);

        let actualError = null;
        let data = web3.utils.randomHex(0);
        try {
          const defundVal = 50;
          const defundRes = await CONTRACT.burn(defundVal, data).send({
            from: addrOwner
          });
        } catch (error) {
          actualError = error;
        }

        const totalSupplyDefunded = await CONTRACT.totalSupply().call();
        const balanceRecipientDefunded = await CONTRACT.balanceOf(
          addrOwner
        ).call();

        assert.strictEqual(totalSupplyBefore, totalSupplyDefunded);
        assert.strictEqual(balanceRecipientBefore, balanceRecipientDefunded);
        assert.strictEqual(
          actualError.toString(),
          "Error: Returned error: VM Exception while processing transaction: revert Contract emergency stop is activated"
        );
      });

      it("attempt to transfer when trading is deactivated", async () => {
        const addrSender = accounts[2];
        const addrRecipient = accounts[3];

        const totalSupplyStart = await CONTRACT.totalSupply().call();
        const balanceSenderStart = await CONTRACT.balanceOf(addrSender).call();
        const balanceRecipientStart = await CONTRACT.balanceOf(
          addrRecipient
        ).call();

        const fundVal = 100;
        const fundRes = await CONTRACT.fund(addrSender, fundVal).send({
          from: addrOwner
        });

        const totalSupplyFund = await CONTRACT.totalSupply().call();
        const balanceSenderFund = await CONTRACT.balanceOf(addrSender).call();
        const balanceRecipientFund = await CONTRACT.balanceOf(
          addrRecipient
        ).call();

        await CONTRACT.emergencyStop().send({ from: addrOwner });
        const status = await CONTRACT.getTradingStatus().call();
        assert.equal(status, false);

        let actualError = null;
        try {
          const transferVal = 50;
          const transferRes = await CONTRACT.send(
            addrRecipient,
            transferVal,
            data
          ).send({
            from: addrSender
          });
        } catch (error) {
          actualError = error;
        }

        const totalSupplyAfterTransfer = await CONTRACT.totalSupply().call();
        const balanceSenderAfterTransfer = await CONTRACT.balanceOf(
          addrSender
        ).call();
        const balanceRecipientAfterTransfer = await CONTRACT.balanceOf(
          addrOwner
        ).call();

        assert.strictEqual(
          parseInt(totalSupplyStart) + parseInt(fundVal),
          parseInt(totalSupplyFund)
        );
        assert.strictEqual(
          parseInt(balanceSenderStart) + parseInt(fundVal),
          parseInt(balanceSenderFund)
        );
        assert.strictEqual(
          parseInt(balanceRecipientStart),
          parseInt(balanceRecipientFund)
        );

        assert.strictEqual(
          parseInt(totalSupplyFund),
          parseInt(totalSupplyAfterTransfer)
        );
        assert.strictEqual(
          parseInt(balanceSenderFund),
          parseInt(balanceSenderAfterTransfer)
        );
        assert.strictEqual(
          parseInt(balanceRecipientFund),
          parseInt(balanceRecipientAfterTransfer)
        );

        assert.strictEqual(
          actualError.toString(),
          "Error: Returned error: VM Exception while processing transaction: revert Contract emergency stop is activated"
        );
      });

      it("deactivate trading attempt transfer, activate trading attempt transfer", async () => {
        const addrSender = accounts[2];
        const addrRecipient = accounts[3];
        const transferVal = 50;

        const totalSupplyStart = await CONTRACT.totalSupply().call();
        const balanceSenderStart = await CONTRACT.balanceOf(addrSender).call();
        const balanceRecipientStart = await CONTRACT.balanceOf(
          addrRecipient
        ).call();

        const fundVal = 100;
        const fundRes = await CONTRACT.fund(addrSender, fundVal).send({
          from: addrOwner
        });

        const totalSupplyFund = await CONTRACT.totalSupply().call();
        const balanceSenderFund = await CONTRACT.balanceOf(addrSender).call();
        const balanceRecipientFund = await CONTRACT.balanceOf(
          addrRecipient
        ).call();

        await CONTRACT.emergencyStop().send({ from: addrOwner });
        const switchStatusbefore = await CONTRACT.getTradingStatus().call();
        assert.equal(switchStatusbefore, false);

        let actualError = null;
        try {
          const transferRes = await CONTRACT.send(
            addrRecipient,
            transferVal,
            data
          ).send({ from: addrSender });
        } catch (error) {
          actualError = error;
        }

        const totalSupplyAfterTransfer = await CONTRACT.totalSupply().call();
        const balanceSenderAfterTransfer = await CONTRACT.balanceOf(
          addrSender
        ).call();
        const balanceRecipientAfterTransfer = await CONTRACT.balanceOf(
          addrRecipient
        ).call();

        assert.strictEqual(
          parseInt(totalSupplyStart) + parseInt(fundVal),
          parseInt(totalSupplyFund)
        );
        assert.strictEqual(
          parseInt(balanceSenderStart) + parseInt(fundVal),
          parseInt(balanceSenderFund)
        );
        assert.strictEqual(
          parseInt(balanceRecipientStart),
          parseInt(balanceRecipientFund)
        );

        assert.strictEqual(
          parseInt(totalSupplyFund),
          parseInt(totalSupplyAfterTransfer)
        );
        assert.strictEqual(
          parseInt(balanceSenderFund),
          parseInt(balanceSenderAfterTransfer)
        );
        assert.strictEqual(
          parseInt(balanceRecipientFund),
          parseInt(balanceRecipientAfterTransfer)
        );

        assert.strictEqual(
          actualError.toString(),
          "Error: Returned error: VM Exception while processing transaction: revert Contract emergency stop is activated"
        );

        await CONTRACT.emergencyStart().send({ from: addrOwner });
        const switchStatusAfter = await CONTRACT.getTradingStatus().call();
        assert.equal(switchStatusAfter, true);

        const totalSupplyAfter = await CONTRACT.totalSupply().call();
        const balanceSenderAfter = await CONTRACT.balanceOf(addrSender).call();
        const balanceRecipientAfter = await CONTRACT.balanceOf(
          addrRecipient
        ).call();

        const fundValAfter = 100;

        const fundResAfter = await CONTRACT.fund(addrSender, fundVal).send({
          from: addrOwner
        });

        const totalSupplyFundAfter = await CONTRACT.totalSupply().call();
        const balanceSenderFundAfter = await CONTRACT.balanceOf(
          addrSender
        ).call();
        const balanceRecipientFundAfter = await CONTRACT.balanceOf(
          addrRecipient
        ).call();

        actualError = null;
        try {
          const transferRes = await CONTRACT.send(
            addrRecipient,
            transferVal,
            data
          ).send({
            from: addrSender
          });
        } catch (error) {
          actualError = error;
        }

        const totalSupplyAfterSwitch = await CONTRACT.totalSupply().call();
        const balanceSenderAfterSwitch = await CONTRACT.balanceOf(
          addrSender
        ).call();
        const balanceRecipientAfterSwitch = await CONTRACT.balanceOf(
          addrRecipient
        ).call();

        assert.strictEqual(
          parseInt(totalSupplyAfter) + parseInt(fundVal),
          parseInt(totalSupplyFundAfter)
        );
        assert.strictEqual(
          parseInt(balanceSenderAfter) + parseInt(fundVal),
          parseInt(balanceSenderFundAfter)
        );
        assert.strictEqual(
          parseInt(balanceRecipientAfter),
          parseInt(balanceRecipientFundAfter)
        );

        assert.strictEqual(
          parseInt(totalSupplyFundAfter),
          parseInt(totalSupplyAfterSwitch)
        );
        assert.strictEqual(
          parseInt(balanceSenderFundAfter),
          parseInt(balanceSenderAfterSwitch) + parseInt(transferVal)
        );
        assert.strictEqual(
          parseInt(balanceRecipientFundAfter),
          parseInt(balanceRecipientAfterSwitch) - parseInt(transferVal)
        );

        assert.strictEqual(actualError, null);
      });
    });

    context("Delegation", () => {
      it("delegated account is able to stop an operation", async () => {
        const delegate = accounts[3];

        await CONTRACT.setEmergencyPermission(delegate).send({
          from: addrOwner
        });

        await CONTRACT.emergencyStop().send({ from: delegate });
        const status = await CONTRACT.getTradingStatus().call();
        assert.equal(status, false);
      });

      it("permission is correctly revoked", async () => {
        const delegate = accounts[3];
        let error = null;
        await CONTRACT.setEmergencyPermission(delegate).send({
          from: addrOwner
        });
        await CONTRACT.setEmergencyPermission(addrOwner).send({
          from: addrOwner
        });

        try {
          await CONTRACT.emergencyStop().send({ from: delegate });
        } catch (err) {
          error = err;
        }

        assert.strictEqual(
          error.toString(),
          "Error: Returned error: VM Exception while processing transaction: revert This account is not allowed to do this"
        );
      });

      it("owner is not able to stop once has delegated", async () => {
        const delegate = accounts[3];
        let error = null;
        await CONTRACT.setEmergencyPermission(delegate).send({
          from: addrOwner
        });

        try {
          await CONTRACT.emergencyStop().send({ from: addrOwner });
        } catch (err) {
          error = err;
        }

        assert.strictEqual(
          error.toString(),
          "Error: Returned error: VM Exception while processing transaction: revert This account is not allowed to do this"
        );
      });

      it("delegate is not able to make payments", async () => {
        const delegate = accounts[2];
        const recipient = accounts[3];
        let error = null;
        let data = web3.utils.randomHex(0);
        await CONTRACT.setEmergencyPermission(delegate).send({
          from: addrOwner
        });
        try {
          await CONTRACT.send(recipient, 10, data).send({ from: delegate });
        } catch (err) {
          error = err;
        }
        assert.strictEqual(
          error.toString(),
          "Error: Returned error: VM Exception while processing transaction: revert The contract owner can not perform this operation"
        );
      });
    });
  });
});
