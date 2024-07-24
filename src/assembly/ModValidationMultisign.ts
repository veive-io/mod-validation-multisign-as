import { System, Storage, authority, Protobuf, value } from "@koinos/sdk-as";
import { modvalidation, ModValidation, MODULE_VALIDATION_TYPE_ID } from "@veive/mod-validation-as";
import { modvalidationmultisign } from "./proto/modvalidationmultisign";
import { IAccount, account } from "@veive/account-as";

const THRESHOLD_SPACE_ID = 1;
const ACCOUNT_SPACE_ID = 2;
const GUARDIANS_SPACE_ID = 3;
const DEFAULT_CONFIG_THRESHOLD: u32 = 1;
const INSTALL_MODULE_ENTRY_POINT = 3730713190;
const UNINSTALL_MODULE_ENTRY_POINT = 2537446827;

export class ModValidationMultisign extends ModValidation {
  callArgs: System.getArgumentsReturn | null;

  contractId: Uint8Array = System.getContractId();

  account_id: Storage.Obj<modvalidationmultisign.account_id> =
    new Storage.Obj(
      this.contractId,
      ACCOUNT_SPACE_ID,
      modvalidationmultisign.account_id.decode,
      modvalidationmultisign.account_id.encode,
      () => new modvalidationmultisign.account_id()
    );

  threshold: Storage.Obj<modvalidationmultisign.threshold> =
    new Storage.Obj(
      this.contractId,
      THRESHOLD_SPACE_ID,
      modvalidationmultisign.threshold.decode,
      modvalidationmultisign.threshold.encode,
      () => new modvalidationmultisign.threshold()
    );

  guardians: Storage.Map<Uint8Array, modvalidationmultisign.guardian> = new Storage.Map(
    System.getContractId(),
    GUARDIANS_SPACE_ID,
    modvalidationmultisign.guardian.decode,
    modvalidationmultisign.guardian.encode,
    () => new modvalidationmultisign.guardian()
  );

  /**
   * Validate operation by checking allowance
   * @external
   */
  is_valid_operation(args: modvalidation.is_valid_operation_args): modvalidation.is_valid_operation_result {
    System.log(`[mod-validation-multisign] is_valid_operation called`);

    const result = new modvalidation.is_valid_operation_result(true);
    let valid_signatures: u32 = 0;

    const i_account = new IAccount(this.account_id.get()!.value!);
    const sig_bytes = System.getTransactionField("signatures")!.message_value!.value!;
    const signatures = Protobuf.decode<value.list_type>(sig_bytes, value.list_type.decode).values;
    const tx_id = System.getTransactionField("id")!.bytes_value;

    const guardians = this.guardians.getManyKeys(new Uint8Array(0));

    for (let i = 0; i < signatures.length; i++) {
      const signature = signatures[i].bytes_value;
      
      for (let j = 0; j < guardians.length; j++) {
        const valid = i_account.is_valid_signature(new account.is_valid_signature_args(
          guardians[j],
          signature,
          tx_id
        ));
  
        if (valid.value == true) {
          valid_signatures = valid_signatures + 1;
        }
      }
    }

    const threshold = this.threshold.get()!.value;
    if (
      (threshold == 0 && valid_signatures != signatures.length) ||
      (threshold > 0 && valid_signatures < threshold)
    ) {
      result.value = false;
      System.log(`[mod-validation-multisign] check signature failed`);
    } else {
      System.log(`[mod-validation-multisign] check signature succeeded`);
    }

    return result;
  }

  /**
   * @external
   */
  set_threshold(args: modvalidationmultisign.set_threshold): void {
    const is_authorized = System.checkAuthority(authority.authorization_type.contract_call, this._get_account_id());
    System.require(is_authorized, `not authorized by the account`);

    const threshold = this.threshold.get()! || new modvalidationmultisign.threshold();
    threshold.value = args.value;
    this.threshold.put(threshold);
  }

  /**
   * @external
   * @readonly 
   */
  get_threshold(): modvalidationmultisign.get_threshold {
    const result = new modvalidationmultisign.get_threshold();
    result.value = this.threshold.get()!.value;
    return result;
  }

  /**
   * @external
   */
  on_install(args: modvalidation.on_install_args): void {
    const account = new modvalidationmultisign.account_id();
    account.value = System.getCaller().caller;
    this.account_id.put(account);

    const threshold = new modvalidationmultisign.threshold();
    threshold.value = DEFAULT_CONFIG_THRESHOLD;
    this.threshold.put(threshold);

    System.log('[mod-validation-multisign] called on_install');
  }

  /**
   * @external
   * @readonly
   */
  manifest(): modvalidation.manifest {
    const result = new modvalidation.manifest();
    result.name = "Signature validator";
    result.description = "Module to validate transaction signature";
    result.type_id = MODULE_VALIDATION_TYPE_ID;
    result.scopes = [
      new modvalidation.scope(INSTALL_MODULE_ENTRY_POINT),
      new modvalidation.scope(UNINSTALL_MODULE_ENTRY_POINT)
    ];
    return result;
  }

  /**
   * Get associated account_id
   * 
   * @external
   * @readonly
   */
  get_account_id(): modvalidationmultisign.account_id {
    return this.account_id.get()!;
  }

  /**
   * return account id
   */
  _get_account_id(): Uint8Array {
    return this.account_id.get()!.value!;
  }

  /**
   * Add a guardian
   * @external
   */
  add_guardian(args: modvalidationmultisign.add_guardian_args): void {
    const is_authorized = System.checkAuthority(authority.authorization_type.contract_call, this._get_account_id());
    System.require(is_authorized, `not authorized by account`);

    const guardian = new modvalidationmultisign.guardian();
    this.guardians.put(args.address!, guardian);
  }

  /**
   * Remove a guardian
   * @external
   */
  remove_guardian(args: modvalidationmultisign.remove_guardian_args): void {
    const is_authorized = System.checkAuthority(authority.authorization_type.contract_call, this._get_account_id());
    System.require(is_authorized, `not authorized by account`);

    this.guardians.remove(args.address!);
  }

  /**
   * Get all guardians
   * @readonly
   * @external
   */
  get_guardians(): modvalidationmultisign.get_guardians_result {
    const result = new modvalidationmultisign.get_guardians_result([]);

    const guardians = this.guardians.getManyKeys(new Uint8Array(0));
    for (let i = 0; i < guardians.length; i++) {
      const key = guardians[i];
      const guardian = this.guardians.get(key)!;
      result.value.push(guardian);
    }

    return result;
  }
}
