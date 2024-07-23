import { Writer, Reader } from "as-proto";

export namespace modvalidationmultisign {
  export class account_id {
    static encode(message: account_id, writer: Writer): void {
      const unique_name_value = message.value;
      if (unique_name_value !== null) {
        writer.uint32(10);
        writer.bytes(unique_name_value);
      }
    }

    static decode(reader: Reader, length: i32): account_id {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new account_id();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.value = reader.bytes();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    value: Uint8Array | null;

    constructor(value: Uint8Array | null = null) {
      this.value = value;
    }
  }

  @unmanaged
  export class threshold {
    static encode(message: threshold, writer: Writer): void {
      if (message.value != 0) {
        writer.uint32(8);
        writer.uint32(message.value);
      }
    }

    static decode(reader: Reader, length: i32): threshold {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new threshold();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.value = reader.uint32();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    value: u32;

    constructor(value: u32 = 0) {
      this.value = value;
    }
  }

  @unmanaged
  export class set_threshold {
    static encode(message: set_threshold, writer: Writer): void {
      if (message.value != 0) {
        writer.uint32(8);
        writer.uint32(message.value);
      }
    }

    static decode(reader: Reader, length: i32): set_threshold {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new set_threshold();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.value = reader.uint32();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    value: u32;

    constructor(value: u32 = 0) {
      this.value = value;
    }
  }

  @unmanaged
  export class get_threshold {
    static encode(message: get_threshold, writer: Writer): void {
      if (message.value != 0) {
        writer.uint32(8);
        writer.uint32(message.value);
      }
    }

    static decode(reader: Reader, length: i32): get_threshold {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new get_threshold();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.value = reader.uint32();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    value: u32;

    constructor(value: u32 = 0) {
      this.value = value;
    }
  }

  @unmanaged
  export class guardian {
    static encode(message: guardian, writer: Writer): void {}

    static decode(reader: Reader, length: i32): guardian {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new guardian();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    constructor() {}
  }

  export class add_guardian_args {
    static encode(message: add_guardian_args, writer: Writer): void {
      const unique_name_address = message.address;
      if (unique_name_address !== null) {
        writer.uint32(18);
        writer.bytes(unique_name_address);
      }
    }

    static decode(reader: Reader, length: i32): add_guardian_args {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new add_guardian_args();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 2:
            message.address = reader.bytes();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    address: Uint8Array | null;

    constructor(address: Uint8Array | null = null) {
      this.address = address;
    }
  }

  export class remove_guardian_args {
    static encode(message: remove_guardian_args, writer: Writer): void {
      const unique_name_address = message.address;
      if (unique_name_address !== null) {
        writer.uint32(18);
        writer.bytes(unique_name_address);
      }
    }

    static decode(reader: Reader, length: i32): remove_guardian_args {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new remove_guardian_args();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 2:
            message.address = reader.bytes();
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    address: Uint8Array | null;

    constructor(address: Uint8Array | null = null) {
      this.address = address;
    }
  }

  export class get_guardians_result {
    static encode(message: get_guardians_result, writer: Writer): void {
      const unique_name_value = message.value;
      for (let i = 0; i < unique_name_value.length; ++i) {
        writer.uint32(10);
        writer.fork();
        guardian.encode(unique_name_value[i], writer);
        writer.ldelim();
      }
    }

    static decode(reader: Reader, length: i32): get_guardians_result {
      const end: usize = length < 0 ? reader.end : reader.ptr + length;
      const message = new get_guardians_result();

      while (reader.ptr < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.value.push(guardian.decode(reader, reader.uint32()));
            break;

          default:
            reader.skipType(tag & 7);
            break;
        }
      }

      return message;
    }

    value: Array<guardian>;

    constructor(value: Array<guardian> = []) {
      this.value = value;
    }
  }
}
