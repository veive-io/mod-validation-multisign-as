## **Mod Validation Multisign**

### **Overview**

`ModValidationMultisign` is a versatile validation module within the Veive protocol, designed to handle multi-signature validation scenarios. This module can be applied in various contexts, such as wallet multi-ownership and account recovery, by utilizing a set of designated signatories known as "guardians." Its flexibility allows the module to support different use cases depending on the scope in which it is installed. The module is agnostic to the signature method, meaning guardians can use different signing methods without affecting the module's functionality.

### **Functional Description**

#### **Purpose and Functionality**

The primary function of `ModValidationMultisign` is to validate operations by requiring multiple signatures from designated guardians. This feature is crucial for scenarios such as:

1. **Account Multi-ownership**: In this context, the module ensures that all owners (guardians) must approve transactions. By installing the module in the `entry_point=allow` scope, every operation requires pre-authorization from all guardians, providing a robust layer of security.

2. **Account Recovery**: The module can also be used to recover access to an account. If the primary owner loses access, the guardians can authorize the installation or removal of modules (such as replacing a lost device's public key in a WebAuthn module). This is achieved by configuring the module to validate operations in the `install_module` and `uninstall_module` scopes.

#### **Guardian Management and Thresholds**

- **Guardians**: Guardians are designated signatories who can validate operations. The module includes functions to add or remove guardians, making it adaptable to changing security needs.
- **Threshold**: A key feature is the ability to set a threshold, determining how many guardian signatures are required to validate an operation. This threshold can be configured for different security levels, allowing for scenarios where, for example, only a subset of guardians is needed to authorize an action.

### **Technical Implementation**

#### **Key Components and Methods**

1. **Storage Objects**
   - `account_id`: Stores the ID of the associated account, ensuring the module can manage permissions correctly.
   - `threshold`: Stores the minimum number of valid signatures required for an operation to be considered valid. This can be set to zero for strict validation (all signatures must be valid) or adjusted for multi-signature scenarios.
   - `guardians`: Manages the list of guardians' addresses, who are authorized to sign and validate operations.

2. **Methods**
   - **`is_valid_operation`**:
     - **Purpose**: Validates an operation by checking if it meets the required number of valid signatures from the guardians.
     - **Implementation**: This method iterates through all signatures attached to a transaction, checking each one against the list of guardians. It counts the valid signatures and compares this count against the set threshold to determine if the operation is valid.

   - **`set_threshold`**:
     - **Purpose**: Sets the number of valid signatures required for an operation to be considered valid.
     - **Implementation**: The threshold can be adjusted, allowing the account owner to specify how many guardians must sign off on an operation for it to proceed.

   - **`get_threshold`**:
     - **Purpose**: Retrieves the current threshold setting.
     - **Implementation**: This method returns the stored threshold value, providing transparency about the validation criteria.

   - **`on_install`**:
     - **Purpose**: Initializes the module upon installation.
     - **Implementation**: Sets the account ID and initializes the threshold, ensuring the module is ready to validate operations according to the configured rules.

   - **`add_guardian`**:
     - **Purpose**: Adds a new guardian to the list.
     - **Implementation**: This method checks if the caller is authorized and then adds the specified guardian address to the list, expanding the group of potential signatories.

   - **`remove_guardian`**:
     - **Purpose**: Removes a guardian from the list.
     - **Implementation**: This method checks if the caller is authorized and then removes the specified guardian address, reducing the group of signatories.

   - **`get_guardians`**:
     - **Purpose**: Retrieves the list of current guardians.
     - **Implementation**: This method returns the list of guardians, providing visibility into who can sign and authorize operations.

   - **`manifest`**:
     - **Purpose**: Provides metadata and configuration settings for the module.
     - **Implementation**: Returns details such as the module's name, description, type ID, and default scopes. For `ModValidationMultisign`, these scopes are typically set to "install_module" and "uninstall_module," facilitating account recovery operations.

### **Usage**

#### **Installation**

To install the `ModValidationMultisign` module, first set up the Veive protocol on your Koinos blockchain environment. Then install the module using yarn:

```bash
yarn add @veive/mod-validation-multisign-as
```

Deploy the module contract on the Koinos blockchain and install it on the desired account using the `install_module` method provided by the Veive account interface. The `on_install` method initializes necessary settings, including the account ID and default threshold.

#### **Scripts**

##### Build

To compile the package, run:

```bash
yarn build
```

##### Dist

To create a distribution, run:

```bash
yarn dist
```

##### Test

To test the package, use:

```bash
yarn jest
```

### **Contributing**

Contributions are welcome! Please open an issue or submit a pull request on the [GitHub repository](https://github.com/veiveprotocol).

### **License**

This project is licensed under the MIT License. See the LICENSE file for details.