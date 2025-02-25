# **Mod Validation Multisign**

## **Overview**

`ModValidationMultisign` is a versatile validation module within the Veive protocol, designed to handle multi-signature validation scenarios. This module can be applied in various contexts, such as wallet multi-ownership and account recovery, by utilizing a set of designated signatories known as "guardians." Its flexibility allows the module to support different use cases depending on the scope in which it is installed. The module is agnostic to the signature method, meaning guardians can use different signing methods without affecting the module's functionality.

## **Purpose**

The primary function of `ModValidationMultisign` is to validate operations by requiring multiple signatures from designated guardians. This feature is crucial for scenarios such as:

1. **Account Multi-ownership**: In this context, the module ensures that all owners (guardians) must approve transactions. By installing the module in the `entry_point=allow` scope, every operation requires pre-authorization from all guardians, providing a robust layer of security.

2. **Account Recovery**: The module can also be used to recover access to an account. If the primary owner loses access, the guardians can authorize the installation or removal of modules (such as replacing a lost device's public key in a WebAuthn module). This is achieved by configuring the module to validate operations in the `install_module` and `uninstall_module` scopes.

### **Guardian Management and Thresholds**

- **Guardians**: Guardians are designated signatories who can validate operations. The module includes functions to add or remove guardians, making it adaptable to changing security needs.
- **Threshold**: A key feature is the ability to set a threshold, determining how many guardian signatures are required to validate an operation. This threshold can be configured for different security levels, allowing for scenarios where, for example, only a subset of guardians is needed to authorize an action.

## **Usage**

### **Installation**

To install the `ModValidationMultisign` module, first set up the Veive protocol on your Koinos blockchain environment. Then install the module using yarn:

```bash
yarn add @veive-io/mod-validation-multisign-as
```

Deploy the module contract on the Koinos blockchain and install it on the desired account using the `install_module` method provided by the Veive account interface. The `on_install` method initializes necessary settings, including the account ID and default threshold.

### **Scripts**

#### Build

To compile the package, run:

```bash
yarn build
```

#### Dist

To create a distribution, run:

```bash
yarn dist
```

#### Test

To test the package, use:

```bash
yarn jest
```

## **Contributing**

Contributions are welcome! Please open an issue or submit a pull request on the [GitHub repository](https://github.com/veiveprotocol).

## **License**

This project is licensed under the MIT License. See the LICENSE file for details.