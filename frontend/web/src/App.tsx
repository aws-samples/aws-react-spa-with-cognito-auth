import React, { useState, useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";

import Amplify from "aws-amplify";
import { AuthState, onAuthUIStateChange } from "@aws-amplify/ui-components";
import {
  AmplifyAuthContainer,
  AmplifyAuthenticator,
  AmplifySignIn,
} from "@aws-amplify/ui-react";
import { getTime } from "./api";

Amplify.configure({
  Auth: {
    region: "ap-northeast-1",
    userPoolId: "ap-northeast-1_xxx", // Please change this value.
    userPoolWebClientId: "xxx", // Please change this value.
  },
});

export const apiEndpoint = "https://xxx.ap-northeast-1.amazonaws.com"; // Please change this value. (Don't include '/api')

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>();
  const [user, setUser] = useState<object | undefined>();
  const [time, setTime] = useState<string>();

  useEffect(() => {
    return onAuthUIStateChange((nextAuthState, authData) => {
      setAuthState(nextAuthState);
      setUser(authData);
    });
  }, []);

  useEffect(() => {
    const _getTime = async () => {
      const res = await getTime();
      setTime(res.cur_date);
    };

    _getTime();
  }, []);

  return authState === AuthState.SignedIn && user ? (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Update Time: {time}</p>
      </header>
    </div>
  ) : (
    <AmplifyAuthContainer>
      <AmplifyAuthenticator>
        <AmplifySignIn slot="sign-in" hideSignUp={true} />
      </AmplifyAuthenticator>
    </AmplifyAuthContainer>
  );
};

export default App;
