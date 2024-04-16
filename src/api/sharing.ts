import {
  UserNotExistingError,
  ItemNotFoundError,
  AlreadySharedError,
  RoleDoesNotExistError,
} from "../errors";
import { ForbiddenError, UnexpectedError } from "../errors";
import { decryptItemKey, encryptItemKey } from "./crypto";

export async function shareItem({
  itemId,
  user,
  role,
  endpoint,
  token,
  privateKey,
  authUserPublicKey,
}: {
  itemId: string;
  user: string;
  role: string;
  endpoint: string;
  token: string;
  privateKey: string;
  authUserPublicKey: string;
}) {
  const response = await fetch(`${endpoint}/keys/item/${itemId}/${user}`, {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body: JSON.stringify({}),
  });

  const { keys, publicKey } = await response.json();

  if (!publicKey) throw new UserNotExistingError();

  if (!keys.length) throw new ItemNotFoundError();

  const decryptedKeys = keys.map((key: any) => ({
    ...key,
    decryptedKey: decryptItemKey(key.key, key.publicKey, privateKey),
  }));

  const encryptedKeys = decryptedKeys.map((key: any) => ({
    itemId: key.itemId,
    publicKey: authUserPublicKey,
    role,
    userId: user,
    key: encryptItemKey(key.decryptedKey, publicKey, privateKey),
  }));

  const shareResponse = await fetch(`${endpoint}/share`, {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body: JSON.stringify({ keys: encryptedKeys, itemId, user }),
  });

  if (shareResponse.status === 403) {
    throw new ForbiddenError();
  } else if (shareResponse.status === 400) {
    throw new AlreadySharedError();
  } else if (shareResponse.status === 401) {
    throw new RoleDoesNotExistError();
  } else if (!shareResponse.ok) {
    throw new UnexpectedError(await response.json());
  }
}

export async function revokeItem({
  itemId,
  user,
  endpoint,
  token,
}: {
  itemId: string;
  user: string;
  endpoint: string;
  token: string;
}) {
  const response = await fetch(`${endpoint}/keys/item/${itemId}/${user}`, {
    method: "DELETE",
    headers: {
      Authorization: token,
    },
  });
  if (response.status === 403) {
    throw new ForbiddenError();
  } else if (!response.ok) {
    throw new UnexpectedError(await response.json());
  }
}

export async function bulkRevokeItems({
  itemIds,
  user,
  endpoint,
  token,
}: {
  itemIds: string[];
  user: string;
  endpoint: string;
  token: string;
}) {
  const response = await fetch(`${endpoint}/revoke/${user}`, {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body: JSON.stringify({
      itemIds,
    }),
  });

  if (response.status === 403) {
    throw new ForbiddenError();
  } else if (!response.ok) {
    throw new UnexpectedError(await response.json());
  }
}

export async function updateRole({
  itemId,
  user,
  role,
  endpoint,
  token,
}: {
  itemId: string;
  user: string;
  role: string;
  endpoint: string;
  token: string;
}) {
  const response = await fetch(
    `${endpoint}/role/${user}`,

    {
      method: "POST",
      headers: {
        Authorization: token,
      },

      body: JSON.stringify({
        itemId,
        role,
      }),
    }
  );

  if (response.status === 403) {
    throw new ForbiddenError();
  } else if (response.status === 401) {
    throw new RoleDoesNotExistError();
  } else if (!response.ok) {
    throw new UnexpectedError(await response.json());
  }
}
