import { Auth } from "aws-amplify";
import { apiEndpoint } from "./App";

export const getToken = async () => {
  const session = await Auth.currentSession();
  return `Bearer ${session.getIdToken().getJwtToken()}`;
};

interface Time {
  cur_date: string;
}

export const getTime = async () => {
  const token = await getToken();
  const res = await fetch(`${apiEndpoint}/api/time`, {
    headers: { Authorization: token },
  });

  return (await res.json()) as Time;
};
