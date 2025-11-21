import { Fragment, useEffect, useState } from "react";
import UserService from "../services/user.service";
import type { User } from "../types/user";

export const UserPage = () => {
  const [user, setUser] = useState<User[]>([]);

  useEffect(() => {
    UserService.getUser().then((res) => {
      setUser(res.data);
    });
  }, []);

  return (
    <>
      {user.map((item) => (
        <Fragment key={item.id}>
          <p>{item.username}</p>
          <p>{item.id}</p>
          <p>{item.email}</p>
          <p>{item.role}</p>
        </Fragment>
      ))}
    </>
  );
};
