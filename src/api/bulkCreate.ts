import { User } from "../auth/AuthClient";
import { ForbiddenError, UnexpectedError } from "../errors";
import { decryptItem, encryptItem } from "./crypto";

type Role = {
  name: string;
  view: boolean;
  update: boolean;
  delete: boolean;
  reference: boolean;
};

type CreateItem = {
  item: any;
  roles: Role[];
  users?: { username: string; role: string }[];
  referenceIds?: string[];
};

type Item = CreateItem & {
  id?: string;
  itemType?: string;
  sharedRoles?: Role[];
  attach?: boolean;
  key?: string;
  userKeys?: UserKey;
  publicKey?: string;
};

type UserKey = {
  publicKey: string;
  username: string;
};

async function getUserKeys(
  item: Item,
  user: User,
  token: string,
  endpoint: string
) {
  if (item.users?.length) {
    const localKeys = user.publicKeys.filter((key: UserKey) =>
      item.users?.some((usr) => usr.username === key.username)
    );

    if (localKeys.length === item.users?.length) {
      return localKeys.map((key: any) => ({
        ...key,
        role: item.users?.find((usr: any) => usr.username === key.username)
          ?.role,
      }));
    }

    const response = await fetch(`${endpoint}/keys`, {
      method: "POST",
      headers: { Authorization: token },
      body: JSON.stringify({ users: item.users }),
    });

    const keys = await response.json();

    return keys.map((key: any) => ({
      ...key,
      role: item.users?.find((usr: any) => usr.username === key.username)?.role,
    }));
  } else if (item.referenceIds && item.referenceIds.length === 1) {
    if (item.sharedRoles?.length) {
      const response = await fetch(
        `${endpoint}/keys/roles/${item.referenceIds[0]}`,

        {
          method: "POST",
          headers: { Authorization: token },
          body: JSON.stringify({ roles: item.sharedRoles }),
        }
      );

      return response.json();
    } else {
      const response = await fetch(`${endpoint}/keys/${item.referenceIds[0]}`, {
        method: "POST",
        headers: { Authorization: token },
      });

      return response.json();
    }
  }
}

export async function bulkCreateItems<T>({
  items,
  type,
  user,
  token,
  endpoint,
}: {
  items: CreateItem[];
  type: string;
  user: User;
  token: string;
  endpoint: string;
}): Promise<T[]> {
  const encryptedItems = await Promise.all(
    items.map(async (item: Item) => {
      const sharedKeys = await getUserKeys(item, user, token, endpoint);

      const { encryptedItem, encryptedKey, encryptedUserKeys } = encryptItem(
        item.item,
        sharedKeys,
        user
      );

      return {
        ...item,
        item: encryptedItem,
        key: encryptedKey,
        userKeys: encryptedUserKeys,
        publicKey: user.keys.encryptionPublicKey,
      };
    })
  );

  const response = await fetch(`${endpoint}/create`, {
    method: "POST",
    headers: {
      Authorization: token,
    },

    body: JSON.stringify({
      items: encryptedItems,
      itemType: type,
    }),
  });

  if (response.status === 403) {
    throw new ForbiddenError();
  } else if (response.status !== 200) {
    throw new UnexpectedError(await response.json());
  }

  const insertedItems = await response.json();

  for (let i = 0; i < insertedItems.length; i++) {
    insertedItems[i].item = await decryptItem(insertedItems[i], user);
  }

  return insertedItems;
}
