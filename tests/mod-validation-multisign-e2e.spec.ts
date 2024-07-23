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

const modMultisign = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider,
});

const mod = new Contract({
  id: modMultisign.getAddress(),
  abi: modAbi,
  provider,
});

const modMultisignContract = mod.functions;
const modMultisignSerializer = mod.serializer;

const modValidationSignatureSign = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider,
});

const modValidationSignature = new Contract({
  id: modMultisign.getAddress(),
  abi: modValidationSignatureAbi,
  provider,
});

const modValidationSignatureContract = modValidationSignature.functions;
const modValidationSignatureSerializer = modValidationSignature.serializer;


const account1Sign = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider,
});

const account1ModEcdsa = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider,
});

const account2Sign = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider,
});

const guardian1Sign = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider,
});

const guardian1ModEcdsa = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider,
});

const guardian2Sign = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider,
});

const guardian2ModEcdsa = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider,
});

const tokenSign = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider,
});

const account1Contract = new Contract({
  id: account1Sign.getAddress(),
  abi: accountAbi,
  provider,
}).functions;

const tokenContract = new Contract({
  id: tokenSign.getAddress(),
  abi: utils.tokenAbi,
  provider,
}).functions;

beforeAll(async () => {
  // start local-koinos node
  await localKoinos.startNode();
  await localKoinos.startBlockProduction();

  await _deploy_account(account1Sign);
  await _deploy_account(guardian1Sign);
  await _deploy_account(guardian2Sign);

  await _deploy_mod_ecdsa(account1ModEcdsa);
  await _deploy_mod_ecdsa(guardian1ModEcdsa);
  await _deploy_mod_ecdsa(guardian2ModEcdsa);

  await _install_mod_ecdsa(account1ModEcdsa, account1Sign);
  await _install_mod_ecdsa(guardian1ModEcdsa, guardian1Sign);
  await _install_mod_ecdsa(guardian2ModEcdsa, guardian2Sign);

  // deploy token
  await localKoinos.deployContract(
    tokenSign.getPrivateKey("wif"),
    path.join(__dirname, "../node_modules/@koinosbox/contracts/assembly/token/release/token.wasm"),
    utils.tokenAbi
  );

  // deploy module validation signature account 1
  await localKoinos.deployContract(
    modValidationSignatureSign.getPrivateKey("wif"),
    path.join(__dirname, "../node_modules/@veive/mod-validation-signature-as/dist/release/ModValidationSignature.wasm"),
    modValidationSignatureAbi
  );

  // deploy module multisign account 1
  await localKoinos.deployContract(
    modMultisign.getPrivateKey("wif"),
    path.join(__dirname, "../build/release/ModValidationMultisign.wasm"),
    modAbi
  );

  // mint some tokens to user
  const tx = new Transaction({
    signer: tokenSign,
    provider,
  });
  await tx.pushOperation(tokenContract["mint"], {
    to: account1Sign.address,
    value: "123",
  });
  await tx.send();
  await tx.wait();
});

afterAll(() => {
  // stop local-koinos node
  localKoinos.stopNode();
});

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
  const scope = await modValidationSignatureSerializer.serialize({
    entry_point: 1
  }, "scope");

  const { operation: install_module } = await account1Contract["install_module"]({
    module_type_id: 1,
    contract_id: modValidationSignatureSign.address,
    scopes: [
      utils.encodeBase64url(scope)
    ]
  }, { onlyOperation: true });
  
  const { operation: exec } = await account1Contract["execute_user"]({
    operation: {
      contract_id: install_module.call_contract.contract_id,
      entry_point: install_module.call_contract.entry_point,
      args: install_module.call_contract.args
    }
  }, { onlyOperation: true });

  const tx = new Transaction({
    signer: account1Sign,
    provider
  });

  await tx.pushOperation(exec);
  const receipt = await tx.send();
  await tx.wait();

  expect(receipt).toBeDefined();
  expect(receipt.logs).toContain("[mod-validation-signature] called on_install");
});

it("install module multisign in account 1, scope (entrypoint=transfer)", async() => {
  const scope = await modMultisignSerializer.serialize({
    entry_point: 670398154
  }, "scope")

  const { operation: install_module } = await account1Contract["install_module"]({
    module_type_id: 1,
    contract_id: modMultisign.address,
    scopes: [
      utils.encodeBase64url(scope)
    ]
  }, { onlyOperation: true });
  
  const { operation: exec } = await account1Contract["execute_user"]({
    operation: {
      contract_id: install_module.call_contract.contract_id,
      entry_point: install_module.call_contract.entry_point,
      args: install_module.call_contract.args
    }
  }, { onlyOperation: true });

  const tx = new Transaction({
    signer: account1Sign,
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
  const { operation: op1 } = await modMultisignContract['add_guardian']({
    user: account1Sign.address,
    address: guardian1Sign.address
  }, { onlyOperation: true });

  //add guardian 2 operation
  const { operation: op2 } = await modMultisignContract['add_guardian']({
    user: account1Sign.address,
    address: guardian2Sign.address
  }, { onlyOperation: true });

  //send operations
  const tx = new Transaction({
    signer: account1Sign,
    provider
  });
  //await tx.pushOperation(setAllowances);
  await tx.pushOperation(op1);
  await tx.pushOperation(op2);
  const rc = await tx.send();

  console.log(rc);

  expect(rc).toBeDefined();
  await tx.wait();

  const { result } = await modMultisignContract["get_guardians"]({
    user: account1Sign.address
  });

  expect(result.value.length).toStrictEqual(2);
});


it("guardian1, guardian2 transfer user's tokens", async () => {
  // prepare transfer operation
  const { operation: transfer } = await tokenContract['transfer']({
    from: account1Sign.address,
    to: account2Sign.address,
    value: "1",
  }, { onlyOperation: true });

  // send operations
  const tx = new Transaction({
    signer: guardian1Sign,
    provider,
    options: {
      beforeSend: async (tx) => {
        await guardian2Sign.signTransaction(tx);
      }
    }
  });

  await tx.pushOperation(transfer);
  const rc = await tx.send();

  expect(rc).toBeDefined();
  await tx.wait();

  // check balances
  const { result: r1 } = await tokenContract["balanceOf"]({
    owner: account1Sign.address
  });
  expect(r1).toStrictEqual({
    value: "122",
  });

  const { result: r2 } = await tokenContract["balanceOf"]({
    owner: account2Sign.address
  });
  expect(r2).toStrictEqual({
    value: "1",
  });
});

it("user removes guardian1", async () => {
  //remove guardian 2 operation
  const { operation: removeGuardian } = await modMultisignContract['remove_guardian']({
    user: account1Sign.address,
    address: guardian2Sign.address
  }, { onlyOperation: true });

  //send operations
  const tx = new Transaction({
    signer: account1Sign,
    provider
  });

  await tx.pushOperation(removeGuardian);
  const rc = await tx.send();

  expect(rc).toBeDefined();
  await tx.wait();

  const { result } = await modMultisignContract["get_guardians"]({
    user: account1Sign.address
  });

  expect(result.value.length).toStrictEqual(1);
});