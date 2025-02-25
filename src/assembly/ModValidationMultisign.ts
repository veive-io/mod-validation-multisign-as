import { System, Storage, authority, Protobuf, value, Arrays } from "@koinos/sdk-as";
import { modvalidation, ModValidation, MODULE_VALIDATION_TYPE_ID } from "@veive-io/mod-validation-as";
import { modvalidationmultisign } from "./proto/modvalidationmultisign";
import { IAccount, account } from "@veive-io/account-as";

const THRESHOLD_SPACE_ID = 1;
const GUARDIANS_SPACE_ID = 2;
const DEFAULT_CONFIG_THRESHOLD: u32 = 1;
const INSTALL_MODULE_ENTRY_POINT = 3730713190;
const UNINSTALL_MODULE_ENTRY_POINT = 2537446827;

export class ModValidationMultisign extends ModValidation {
  callArgs: System.getArgumentsReturn | null;

  contract_id: Uint8Array = System.getContractId();

  threshold_storage: Storage.Map<Uint8Array, modvalidationmultisign.threshold> = new Storage.Map(
    this.contract_id,
    THRESHOLD_SPACE_ID,
    modvalidationmultisign.threshold.decode,
    modvalidationmultisign.threshold.encode,
    () => new modvalidationmultisign.threshold()
  );

  guardians_storage: Storage.Map<Uint8Array, modvalidationmultisign.guardians> = new Storage.Map(
    this.contract_id,
    GUARDIANS_SPACE_ID,
    modvalidationmultisign.guardians.decode,
    modvalidationmultisign.guardians.encode,
    () => new modvalidationmultisign.guardians()
  );

  /**
   * Validate operation by checking allowance
   * @external
   */
  is_authorized(args: modvalidation.authorize_arguments): modvalidation.authorize_result {
    const user = System.getCaller().caller;

    System.log(`[mod-validation-multisign] is_valid_operation called`);

    const result = new modvalidation.authorize_result(true);
    let valid_signatures: u32 = 0;

    const i_account = new IAccount(user);
    const sig_bytes = System.getTransactionField("signatures")!.message_value!.value!;
    const signatures = Protobuf.decode<value.list_type>(sig_bytes, value.list_type.decode).values;
    const tx_id = System.getTransactionField("id")!.bytes_value;

    const guardians = this.guardians_storage.get(user);
    if (!guardians) {
      result.value = false;
      return result;
    }

    for (let i = 0; i < signatures.length; i++) {
      const signature = signatures[i].bytes_value;
      
      for (let j = 0; j < guardians.value.length; j++) {
        const valid = i_account.is_valid_signature(new account.is_valid_signature_args(
          guardians.value[j],
          signature,
          tx_id
        ));
  
        if (valid.value == true) {
          valid_signatures = valid_signatures + 1;
        }
      }
    }

    const threshold = this.threshold_storage.get(user)!.value;
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
  set_threshold(args: modvalidationmultisign.set_threshold_args): void {
    const is_authorized = System.checkAuthority(authority.authorization_type.contract_call, args.user!);
    System.require(is_authorized, `not authorized by the account`);

    const threshold = this.threshold_storage.get(args.user!)! || new modvalidationmultisign.threshold();
    threshold.value = args.value;
    this.threshold_storage.put(args.user!, threshold);
  }

  /**
   * @external
   * @readonly 
   */
  get_threshold(args: modvalidationmultisign.get_threshold_args): modvalidationmultisign.get_threshold_result {
    const result = new modvalidationmultisign.get_threshold_result();
    result.value = this.threshold_storage.get(args.user!)!.value;
    return result;
  }

  /**
   * @external
   */
  on_install(args: modvalidation.on_install_args): void {
    const user = System.getCaller().caller;
    const threshold = new modvalidationmultisign.threshold();
    threshold.value = DEFAULT_CONFIG_THRESHOLD;
    this.threshold_storage.put(user, threshold);

    System.log('[mod-validation-multisign] called on_install');
  }

  /**
   * @external
   * @readonly
   */
  manifest(): modvalidation.manifest {
    const result = new modvalidation.manifest();
    result.name = "Multisign validator";
    result.description = "Module to validate transaction with multiple account signatures";
    result.type_id = MODULE_VALIDATION_TYPE_ID;
    result.version = "2.0.0";
    result.scopes = [
      new modvalidation.scope('contract_upload'),
      new modvalidation.scope('transaction_application'),
      new modvalidation.scope('contract_call', INSTALL_MODULE_ENTRY_POINT),
      new modvalidation.scope('contract_call', UNINSTALL_MODULE_ENTRY_POINT)
    ];
    return result;
  }

  /**
   * Add a guardian
   * @external
   */
  add_guardian(args: modvalidationmultisign.add_guardian_args): void {
    const is_authorized = System.checkAuthority(authority.authorization_type.contract_call, args.user!);
    System.require(is_authorized, `not authorized by account`);

    const guardians = this.guardians_storage.get(args.user!);

    if (guardians) {
      for (let i = 0; i < guardians.value.length; i++) {
        const guardian = guardians.value[i];
        if (Arrays.equal(guardian, args.address!)) {
          System.fail("[mod-validation-multisign] guardian already present");
        }
      }
  
      guardians.value.push(args.address!);
      this.guardians_storage.put(args.user!, guardians);
    }
  }

  /**
   * Remove a guardian
   * @external
   */
  remove_guardian(args: modvalidationmultisign.remove_guardian_args): void {
    const is_authorized = System.checkAuthority(authority.authorization_type.contract_call, args.user!);
    System.require(is_authorized, `not authorized by account`);

    const guardians = this.guardians_storage.get(args.user!);

    if (guardians) {
      const new_guardians = new modvalidationmultisign.guardians([]);

      for (let i = 0; i < guardians.value.length; i++) {
        const guardian = guardians.value[i];
        if (!Arrays.equal(guardian, args.address!)) {
          new_guardians.value.push(guardian);
        }
      }
  
      this.guardians_storage.put(args.user!, new_guardians);
    }
  }

  /**
   * Get all guardians
   * @readonly
   * @external
   */
  get_guardians(args: modvalidationmultisign.get_guardians_args): modvalidationmultisign.get_guardians_result {
    const result = new modvalidationmultisign.get_guardians_result([]);

    const guardians = this.guardians_storage.get(args.user!);

    if (guardians) {
      result.value = guardians.value;
    }

    return result;
  }
}
