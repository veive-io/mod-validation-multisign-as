import { LocalKoinos } from "@roamin/local-koinos";
import { Contract, Provider, Signer, Transaction, utils } from "koilib";
import path from "path";
import { randomBytes } from "crypto";
import { beforeAll, afterAll, it, expect } from "@jest/globals";
import * as modAbi from "../build/modvalidationmultisign-abi.json";
import * as modSignEcdsaAbi from "../node_modules/@veive/mod-sign-ecdsa-as/dist/modsignecdsa-abi.json";
import * as modValidationSignatureAbi from "../node_modules/@veive/mod-validation-signature-as/dist/modvalidationsignature-abi.json";
import * as accountAbi from "@veive/account-as/dist/account-abi.json";
import * as dotenv from "dotenv";

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

const account1_modSignEcdsa = _generate_account(modSignEcdsaAbi);
const guardian1_modSignEcdsa = _generate_account(modSignEcdsaAbi);
const guardian2_modSignEcdsa = _generate_account(modSignEcdsaAbi);

const token = _generate_account(utils.tokenAbi);


beforeAll(async () => {
  // start local-koinos node
  await localKoinos.startNode();
  await localKoinos.startBlockProduction();

  await _deploy_account(account1.signer);
  await _deploy_account(guardian1.signer);
  await _deploy_account(guardian2.signer);

  await _deploy_mod_ecdsa(account1_modSignEcdsa.signer);
  await _deploy_mod_ecdsa(guardian1_modSignEcdsa.signer);
  await _deploy_mod_ecdsa(guardian2_modSignEcdsa.signer);

  await _install_mod_ecdsa(account1_modSignEcdsa.signer, account1.signer);
  await _install_mod_ecdsa(guardian1_modSignEcdsa.signer, guardian1.signer);
  await _install_mod_ecdsa(guardian2_modSignEcdsa.signer, guardian2.signer);

  // deploy token
  await localKoinos.deployContract(
    token.private_key,
    path.join(__dirname, "../node_modules/@koinosbox/contracts/assembly/token/release/token.wasm"),
    utils.tokenAbi
  );

  // deploy module validation signature account 1
  await localKoinos.deployContract(
    modValidationSignature.private_key,
    path.join(__dirname, "../node_modules/@veive/mod-validation-signature-as/dist/release/ModValidationSignature.wasm"),
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
  const signer = new Signer({privateKey: randomBytes(32).toString("hex"), provider});
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
    path.join(__dirname, "../node_modules/@veive/account-as/dist/release/Account.wasm"),
    accountAbi,
    {},
    {
      authorizesCallContract: true,
      authorizesTransactionApplication: false,
      authorizesUploadContract: false,
    }
  );
}

async function _deploy_mod_ecdsa(sign: Signer) {
  await localKoinos.deployContract(
    sign.getPrivateKey("wif"),
    path.join(__dirname, "../node_modules/@veive/mod-sign-ecdsa-as/dist/release/ModSignEcdsa.wasm"),
    modSignEcdsaAbi
  );
}

async function _install_mod_ecdsa(modSign: Signer, accountSign: Signer) {
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


it("install module validation-signature in account 1, scope default (any operation)", async() => {
  const scope = await modValidationSignature.serializer.serialize({
    entry_point: 1
  }, "scope");

  const { operation: install_module } = await account1.contract["install_module"]({
    module_type_id: 1,
    contract_id: modValidationSignature.address,
    scopes: [
      utils.encodeBase64url(scope)
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
});

it("install module multisign in account 1, scope (entrypoint=transfer)", async() => {
  const scope = await mod.serializer.serialize({
    entry_point: 670398154
  }, "scope")

  const { operation: install_module } = await account1.contract["install_module"]({
    module_type_id: 1,
    contract_id: mod.address,
    scopes: [
      utils.encodeBase64url(scope)
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

  console.log(rc);

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