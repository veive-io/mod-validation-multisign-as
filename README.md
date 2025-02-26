# **Mod Validation Multisign**

## **Overview**

`ModValidationMultisign` is a versatile validation module within the Veive protocol, designed to handle multi-signature validation scenarios. This module can be applied in various contexts, such as wallet multi-ownership and account recovery, by utilizing a set of designated signatories known as "guardians." Its flexibility allows the module to support different use cases depending on the scope in which it is installed. The module is agnostic to the signature method, meaning guardians can use different signing methods without affecting the module's functionality.

Full documentation: https://docs.veive.io/veive-docs/framework/core-modules/mod-validation-multisign

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
