import React from 'react';
import { Button } from '@chakra-ui/react';
import { useGoogleLogout } from 'react-google-login';
import CoveyTownUser from './User';
import useCoveyAppState from '../../hooks/useCoveyAppState';

const clientId =
  '147790869304-31si4r0ejgmklrphlis0eehdgk0qo9qo.apps.googleusercontent.com';

function LogoutHooks() {
  const { dbClient } = useCoveyAppState();

  async function setOffline() {
    const userProfile = CoveyTownUser.getInstance();
    const userEmail = userProfile.getUserEmail();
    await dbClient.setOnlineStatus({ email: userEmail, isOnline: false });
  }

  const onLogoutSuccess = () => {
    console.log('Logged out successfully.');
    setOffline();
  };

  const onFailure = () => {
    console.log('Failed to login.');
  };

  const { signOut } = useGoogleLogout({
    clientId,
    onLogoutSuccess,
    onFailure,
  });

  return (
    <Button onClick={signOut} className="button">
      {/* <img src="icons/google.svg" alt="google login" className="icon"></img> */}

      <span className="buttonText">Sign out</span>
    </Button>
  );
}

export default LogoutHooks;