import { LocalKoinos } from "@roamin/local-koinos";
import { Contract, Provider, Signer, Transaction, utils } from "koilib";
import path from "path";
import { randomBytes } from "crypto";
import { beforeAll, afterAll, it, expect } from "@jest/globals";
import * as modAbi from "../build/modvalidationmultisign-abi.json";
import * as modSignMnemonicAbi from "../node_modules/@veive-io/mod-sign-mnemonic-as/dist/modsignmnemonic-abi.json";
import * as modValidationSignatureAbi from "../node_modules/@veive-io/mod-validation-signature-as/dist/modvalidationsignature-abi.json";
import * as accountAbi from "@veive-io/account-as/dist/account-abi.json";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config();

jest.setTimeout(600000);

const localKoinos = new LocalKoinos();
const provider = localKoinos.getProvider() as unknown as Provider;


const mod = _generate_account(modAbi);
const modValidationSignature = _generate_account(modValidationSignatureAbi);
const account1 = _generate_account(accountAbi);
const account2 = _generate_account(accountAbi);
const guardian1 = _generate_account(accountAbi);
const guardian2 = _generate_account(accountAbi);

const account1_modSignMnemonic = _generate_account(modSignMnemonicAbi);
const guardian1_modSignMnemonic = _generate_account(modSignMnemonicAbi);
const guardian2_modSignMnemonic = _generate_account(modSignMnemonicAbi);

const token = _generate_account(utils.tokenAbi);


beforeAll(async () => {
  // start local-koinos node
  await localKoinos.startNode();
  await localKoinos.startBlockProduction();

  await _deploy_account(account1.signer);
  await _deploy_account(guardian1.signer);
  await _deploy_account(guardian2.signer);

  await _deploy_mod_mnemonic(account1_modSignMnemonic.signer);
  await _deploy_mod_mnemonic(guardian1_modSignMnemonic.signer);
  await _deploy_mod_mnemonic(guardian2_modSignMnemonic.signer);

  await _install_mod_mnemonic(account1_modSignMnemonic.signer, account1.signer);
  await _install_mod_mnemonic(guardian1_modSignMnemonic.signer, guardian1.signer);
  await _install_mod_mnemonic(guardian2_modSignMnemonic.signer, guardian2.signer);

  // deploy token
  await localKoinos.deployContract(
    token.private_key,
    path.join(__dirname, "../node_modules/@koinosbox/contracts/assembly/token/release/token.wasm"),
    utils.tokenAbi
  );

  // deploy module validation signature account 1
  await localKoinos.deployContract(
    modValidationSignature.private_key,
    path.join(__dirname, "../node_modules/@veive-io/mod-validation-signature-as/dist/release/ModValidationSignature.wasm"),
    modValidationSignatureAbi
  );

  // deploy module multisign account 1
  await localKoinos.deployContract(
    mod.private_key,
    path.join(__dirname, "../build/release/ModValidationMultisign.wasm"),
    modAbi
  );

  // mint some tokens to user
  const tx = new Transaction({
    signer: token.signer,
    provider,
  });
  await tx.pushOperation(token.contract["mint"], {
    to: account1.address,
    value: "123",
  });
  await tx.send();
  await tx.wait();
});

afterAll(() => {
  // stop local-koinos node
  localKoinos.stopNode();
});


function _generate_account(abi) {
  const signer = new Signer({ privateKey: randomBytes(32).toString("hex"), provider });
  const contract = new Contract({
    id: signer.address,
    abi,
    provider,
  })
  return {
    signer: signer,
    address: signer.address,
    contract: contract.functions,
    serializer: contract.serializer,
    private_key: signer.getPrivateKey("wif")
  };
}

async function _deploy_account(sign: Signer) {
  await localKoinos.deployContract(
    sign.getPrivateKey("wif"),
    path.join(__dirname, "../node_modules/@veive-io/account-as/dist/release/Account.wasm"),
    accountAbi,
    {},
    {
      authorizesCallContract: true,
      authorizesTransactionApplication: true,
      authorizesUploadContract: true,
    }
  );
}

async function _deploy_mod_mnemonic(sign: Signer) {
  await localKoinos.deployContract(
    sign.getPrivateKey("wif"),
    path.join(__dirname, "../node_modules/@veive-io/mod-sign-mnemonic-as/dist/release/ModSignMnemonic.wasm"),
    modSignMnemonicAbi
  );
}

async function _install_mod_mnemonic(modSign: Signer, accountSign: Signer) {
  const accountContract = new Contract({
    id: accountSign.getAddress(),
    abi: accountAbi,
    provider,
  }).functions;

  const { operation: install_module } = await accountContract["install_module"]({
    module_type_id: 3,
    contract_id: modSign.address
  }, { onlyOperation: true });

  const { operation: exec } = await accountContract["execute_user"]({
    operation: {
      contract_id: install_module.call_contract.contract_id,
      entry_point: install_module.call_contract.entry_point,
      args: install_module.call_contract.args
    }
  }, { onlyOperation: true });

  const tx = new Transaction({
    signer: accountSign,
    provider
  });

  await tx.pushOperation(exec);
  await tx.send();
  await tx.wait();
}

it("install module validation-signature in account 1, scope default (any operation)", async () => {
  const scope1 = await modValidationSignature.serializer.serialize({ operation_type: 'contract_call' }, "scope");
  const scope2 = await modValidationSignature.serializer.serialize({ operation_type: 'contract_upload' }, "scope");
  const scope3 = await modValidationSignature.serializer.serialize({ operation_type: 'transaction_application' }, "scope");

  const { operation: install_module } = await account1.contract["install_module"]({
    module_type_id: 1,
    contract_id: modValidationSignature.address,
    scopes: [
      utils.encodeBase64url(scope1),
      utils.encodeBase64url(scope2),
      utils.encodeBase64url(scope3)
    ]
  }, { onlyOperation: true });

  const { operation: exec } = await account1.contract["execute_user"]({
    operation: {
      contract_id: install_module.call_contract.contract_id,
      entry_point: install_module.call_contract.entry_point,
      args: install_module.call_contract.args
    }
  }, { onlyOperation: true });

  const tx = new Transaction({
    signer: account1.signer,
    provider
  });

  await tx.pushOperation(exec);
  const receipt = await tx.send();
  await tx.wait();

  expect(receipt).toBeDefined();
  expect(receipt.logs).toContain("[mod-validation-signature] called on_install");

  const { result: r1 } = await account1.contract["get_modules"]();
  expect(r1.value).toContain(modValidationSignature.address);
});

it("install module multisign in account 1, scope (entrypoint=transfer)", async () => {
  const scope = await mod.serializer.serialize({
    operation_type: 'contract_call',
    entry_point: 670398154
  }, "scope");

  const { operation: install_module } = await account1.contract["install_module"]({
    module_type_id: 1,
    contract_id: mod.address,
    scopes: [
      utils.encodeBase64url(scope),
    ]
  }, { onlyOperation: true });

  const { operation: exec } = await account1.contract["execute_user"]({
    operation: {
      contract_id: install_module.call_contract.contract_id,
      entry_point: install_module.call_contract.entry_point,
      args: install_module.call_contract.args
    }
  }, { onlyOperation: true });

  const tx = new Transaction({
    signer: account1.signer,
    provider
  });

  await tx.pushOperation(exec);
  const receipt = await tx.send();
  await tx.wait();

  expect(receipt).toBeDefined();
  expect(receipt.logs).toContain("[mod-validation-multisign] called on_install");
});

it("guardian1, guardian2 (not yet guardians) tries to transfer user's tokens", async () => {
  // prepare transfer operation
  const { operation: transfer } = await token.contract['transfer']({
    from: account1.address,
    to: account2.address,
    value: "1",
  }, { onlyOperation: true });

  // send operations
  const tx = new Transaction({
    signer: guardian1.signer,
    provider,
    options: {
      beforeSend: async (tx) => {
        await guardian2.signer.signTransaction(tx);
      }
    }
  });

  await tx.pushOperation(transfer);

  let error = undefined;
  try {
      await tx.send();
  } catch (e) {
      error = e;
  }

  expect(error).toBeDefined();
});


it("user adds guardian1,guardian2 as this guardians", async () => {
  //add guardian 1 operation
  const { operation: op1 } = await mod.contract['add_guardian']({
    user: account1.address,
    address: guardian1.address
  }, { onlyOperation: true });

  //add guardian 2 operation
  const { operation: op2 } = await mod.contract['add_guardian']({
    user: account1.address,
    address: guardian2.address
  }, { onlyOperation: true });

  //send operations
  const tx = new Transaction({
    signer: account1.signer,
    provider
  });
  //await tx.pushOperation(setAllowances);
  await tx.pushOperation(op1);
  await tx.pushOperation(op2);
  const rc = await tx.send();

  expect(rc).toBeDefined();
  await tx.wait();

  const { result } = await mod.contract["get_guardians"]({
    user: account1.address
  });

  expect(result.value.length).toStrictEqual(2);
});

it("guardian1, guardian2 transfer user's tokens", async () => {
  // prepare transfer operation
  const { operation: transfer } = await token.contract['transfer']({
    from: account1.address,
    to: account2.address,
    value: "1",
  }, { onlyOperation: true });

  // send operations
  const tx = new Transaction({
    signer: guardian1.signer,
    provider,
    options: {
      beforeSend: async (tx) => {
        await guardian2.signer.signTransaction(tx);
      }
    }
  });

  await tx.pushOperation(transfer);
  const rc = await tx.send();

  expect(rc).toBeDefined();
  await tx.wait();

  // check balances
  const { result: r1 } = await token.contract["balanceOf"]({
    owner: account1.address
  });
  expect(r1).toStrictEqual({
    value: "122",
  });

  const { result: r2 } = await token.contract["balanceOf"]({
    owner: account2.address
  });
  expect(r2).toStrictEqual({
    value: "1",
  });
});

it("guardian1, guardian2 tries updating user contract", async () => {
  const wasm = fs.readFileSync(path.join(__dirname, "../node_modules/@veive-io/account-as/dist/release/Account.wasm"));
  const bytecode = new Uint8Array(wasm);

  const tx = new Transaction({
    signer: guardian1.signer,
    provider,
    options: {
      beforeSend: async (tx) => {
        await guardian2.signer.signTransaction(tx);
      }
    }
  });

  const smartContract = new Contract({
    id: account1.address,
    abi: accountAbi,
    provider,
    bytecode,
    signer: guardian1.signer
  });

  const { operation } = await smartContract.deploy({
    abi: JSON.stringify(accountAbi),
    authorizesCallContract: true,
    authorizesTransactionApplication: true,
    authorizesUploadContract: true,
    onlyOperation: true
  });

  await tx.pushOperation(operation);
  let error = undefined;
  try {
      await tx.send();
  } catch (e) {
      error = e;
  }

  expect(error).toBeDefined();
});

it("user install module multisign in account 1, scope contract_upload", async () => {
  const scope = await mod.serializer.serialize({
    operation_type: 'contract_upload',
  }, "scope");

  const { operation: install_module } = await account1.contract["install_module"]({
    module_type_id: 1,
    contract_id: mod.address,
    scopes: [
      utils.encodeBase64url(scope),
    ]
  }, { onlyOperation: true });

  const { operation: exec } = await account1.contract["execute_user"]({
    operation: {
      contract_id: install_module.call_contract.contract_id,
      entry_point: install_module.call_contract.entry_point,
      args: install_module.call_contract.args
    }
  }, { onlyOperation: true });

  const tx = new Transaction({
    signer: account1.signer,
    provider
  });

  await tx.pushOperation(exec);
  const receipt = await tx.send();
  await tx.wait();

  expect(receipt).toBeDefined();
  expect(receipt.logs).toContain("[mod-validation-multisign] called on_install");
});

it("guardian1, guardian2 update user contract", async () => {
  const wasm = fs.readFileSync(path.join(__dirname, "../node_modules/@veive-io/account-as/dist/release/Account.wasm"));
  const bytecode = new Uint8Array(wasm);

  const tx = new Transaction({
    signer: guardian1.signer,
    provider,
    options: {
      beforeSend: async (tx) => {
        await guardian2.signer.signTransaction(tx);
      }
    }
  });

  const smartContract = new Contract({
    id: account1.address,
    abi: accountAbi,
    provider,
    bytecode,
    signer: guardian1.signer
  });

  const { operation } = await smartContract.deploy({
    abi: JSON.stringify(accountAbi),
    authorizesCallContract: true,
    authorizesTransactionApplication: true,
    authorizesUploadContract: true,
    onlyOperation: true
  });

  await tx.pushOperation(operation);
  const receipt = await tx.send();
  await tx.wait();

  console.log(receipt);

  expect(receipt).toBeDefined();
  expect(receipt.logs).toContain(`[account] selected scope contract_upload`);
  expect(receipt.logs).toContain(`[account] selected validator ${mod.address}`);
});

it("user removes guardian1", async () => {
  //remove guardian 2 operation
  const { operation: removeGuardian } = await mod.contract['remove_guardian']({
    user: account1.address,
    address: guardian2.address
  }, { onlyOperation: true });

  //send operations
  const tx = new Transaction({
    signer: account1.signer,
    provider
  });

  await tx.pushOperation(removeGuardian);
  const rc = await tx.send();

  expect(rc).toBeDefined();
  await tx.wait();

  const { result } = await mod.contract["get_guardians"]({
    user: account1.address
  });

  expect(result.value.length).toStrictEqual(1);
});