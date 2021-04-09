import React, { useCallback, useEffect, useState } from 'react';
import assert from "assert";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Table,
  TableCaption,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useToast
} from '@chakra-ui/react';
import {UserStatus} from '../../classes/DatabaseServiceClient';
import LoginHooks from './LoginHooks'
import LogoutHooks from './LogoutHooks'
import useVideoContext from '../VideoCall/VideoFrontend/hooks/useVideoContext/useVideoContext';
import Video from '../../classes/Video/Video';
import { CoveyTownInfo, TownJoinResponse, } from '../../classes/TownsServiceClient';
import useCoveyAppState from '../../hooks/useCoveyAppState';
import CoveyTownUser from './User';

interface TownSelectionProps {
  doLogin: (initData: TownJoinResponse) => Promise<boolean>
}

export default function TownSelection({ doLogin }: TownSelectionProps): JSX.Element {
  const [userName, setUserName] = useState<string>(Video.instance()?.userName || '');
  const [newTownName, setNewTownName] = useState<string>('');
  const [newTownIsPublic, setNewTownIsPublic] = useState<boolean>(true);
  const [townIDToJoin, setTownIDToJoin] = useState<string>('');
  const [currentPublicTowns, setCurrentPublicTowns] = useState<CoveyTownInfo[]>();
  const { connect } = useVideoContext();
  const { apiClient } = useCoveyAppState();
  const {dbClient} = useCoveyAppState();
  const toast = useToast();

  const [currentFriendList, setFriendList] = useState<UserStatus[]>();


  // New code
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const checkUserStatus = useCallback(async () => {
    const userProfile = CoveyTownUser.getInstance();
    const userEmail = userProfile.getUserEmail();
    const status  = await dbClient.getOnlineStatus({ email: userEmail });
    setIsLoggedIn(status);
  }, [dbClient]);

  

  const updateFriendList = useCallback(async () => {
      const exist = await dbClient.userExistence({email: 'cl@gmail.com'})
      console.log('user exists: ', exist)
      const friends = await dbClient.getFriends({email: 'cl@gmail.com'})
      console.log(friends)
      let status  = await dbClient.getOnlineStatus({email: 'cl@gmail.com'})
      console.log('status before:', status)
      await dbClient.setOnlineStatus({email: 'cl@gmail.com', isOnline: true})
      status = await dbClient.getOnlineStatus({email: 'cl@gmail.com'})
      console.log('status after:', status)

      const newUser = {firstName: 'Robert',
      lastName: 'Kubica',
      email: 'rk@gmail.com',
      friends: [],
      isOnline: false}
      await dbClient.addUser( {user: newUser });
      
      await dbClient.addFriend({email: 'cl@gmail.com', friendEmail: 'abd@gmail.com'})
      await dbClient.deleteFriend({email: 'cl@gmail.com', friendEmail: 'dr@gmail.com'})
    }, [dbClient]);
  
  useEffect(() => {
    updateFriendList();
    checkUserStatus();
    // const timer1 = setInterval(checkUserStatus, 2000);
    const timer2 = setInterval(updateFriendList, 2000);
    return () => {
      // clearInterval(timer1)
      clearInterval(timer2)
    };
  }, [updateFriendList, checkUserStatus]);
  
  

  const updateTownListings = useCallback(() => {
    // console.log(apiClient);
    apiClient.listTowns()
      .then((towns) => {
        setCurrentPublicTowns(towns.towns
          .sort((a, b) => b.currentOccupancy - a.currentOccupancy)
        );
      })
  }, [setCurrentPublicTowns, apiClient]);

  useEffect(() => {
    updateTownListings();
    const timer = setInterval(updateTownListings, 2000);
    return () => {
      clearInterval(timer)
    };
  }, [updateTownListings]);

  const handleJoin = useCallback(async (coveyRoomID: string) => {
    try {
      if (!userName || userName.length === 0) {
        toast({
          title: 'Unable to join town',
          description: 'Please select a username',
          status: 'error',
        });
        return;
      }
      if (!coveyRoomID || coveyRoomID.length === 0) {
        toast({
          title: 'Unable to join town',
          description: 'Please enter a town ID',
          status: 'error',
        });
        return;
      }
      const initData = await Video.setup(userName, coveyRoomID);

      const loggedIn = await doLogin(initData);
      if (loggedIn) {
        assert(initData.providerVideoToken);
        await connect(initData.providerVideoToken);
      }
    } catch (err) {
      toast({
        title: 'Unable to connect to Towns Service',
        description: err.toString(),
        status: 'error'
      })
    }
  }, [doLogin, userName, connect, toast]);

  const handleCreate = async () => {
    if (!userName || userName.length === 0) {
      toast({
        title: 'Unable to create town',
        description: 'Please select a username before creating a town',
        status: 'error',
      });
      return;
    }
    if (!newTownName || newTownName.length === 0) {
      toast({
        title: 'Unable to create town',
        description: 'Please enter a town name',
        status: 'error',
      });
      return;
    }
    try {
      const newTownInfo = await apiClient.createTown({
        friendlyName: newTownName,
        isPubliclyListed: newTownIsPublic
      });
      let privateMessage = <></>;
      if (!newTownIsPublic) {
        privateMessage =
          <p>This town will NOT be publicly listed. To re-enter it, you will need to use this
            ID: {newTownInfo.coveyTownID}</p>;
      }
      toast({
        title: `Town ${newTownName} is ready to go!`,
        description: <>{privateMessage}Please record these values in case you need to change the
          room:<br/>Town ID: {newTownInfo.coveyTownID}<br/>Town Editing
          Password: {newTownInfo.coveyTownPassword}</>,
        status: 'success',
        isClosable: true,
        duration: null,
      })
      await handleJoin(newTownInfo.coveyTownID);
    } catch (err) {
      toast({
        title: 'Unable to connect to Towns Service',
        description: err.toString(),
        status: 'error'
      })
    }
  };

  return (
    <>
      <form>
        <Stack>
          {isLoggedIn ? (
            <Box p="4" borderWidth="1px" borderRadius="lg">
            <Heading p="4" as="h4" size="md">Friend list</Heading>
            <Table>
                <TableCaption placement="bottom">Friends</TableCaption>
                <Thead><Tr><Th>Username</Th><Th>Status</Th><Th>Remove</Th></Tr></Thead>
                <Tbody>

                {currentFriendList?.map((friends) => (
                    <Tr key={friends.email}><Td role='cell'>{friends.email}</Td>
                      <Td role='cell'>{friends.isOnline.toString()}</Td>
                        <Td role='cell'> <Button> Delete Friend</Button></Td></Tr>
                  ))}

                </Tbody>
              </Table>
            <LogoutHooks/>
            </Box>
          ) : (
            <Box p="4" borderWidth="1px" borderRadius="lg">
            <Heading as="h2" size="lg">Select a username</Heading>

            <FormControl>
              <FormLabel htmlFor="name">Name</FormLabel>
              <Input autoFocus name="name" placeholder="Your name"
                     value={userName}
                     onChange={event => setUserName(event.target.value)}
              />
            </FormControl>

            <Heading p="4" as="h2" size="lg">-or-</Heading>
            <LoginHooks/>
            </Box>
          )}



          <Box borderWidth="1px" borderRadius="lg">
            <Heading p="4" as="h2" size="lg">Create a New Town</Heading>
            <Flex p="4">
              <Box flex="1">
                <FormControl>
                  <FormLabel htmlFor="townName">New Town Name</FormLabel>
                  <Input name="townName" placeholder="New Town Name"
                         value={newTownName}
                         onChange={event => setNewTownName(event.target.value)}
                  />
                </FormControl>
              </Box><Box>
              <FormControl>
                <FormLabel htmlFor="isPublic">Publicly Listed</FormLabel>
                <Checkbox id="isPublic" name="isPublic" isChecked={newTownIsPublic}
                          onChange={(e) => {
                            setNewTownIsPublic(e.target.checked)
                          }}/>
              </FormControl>
            </Box>
              <Box>
                <Button data-testid="newTownButton" onClick={handleCreate}>Create</Button>
              </Box>
            </Flex>
          </Box>
          <Heading p="4" as="h2" size="lg">-or-</Heading>

          <Box borderWidth="1px" borderRadius="lg">
            <Heading p="4" as="h2" size="lg">Join an Existing Town</Heading>
            <Box borderWidth="1px" borderRadius="lg">
              <Flex p="4"><FormControl>
                <FormLabel htmlFor="townIDToJoin">Town ID</FormLabel>
                <Input name="townIDToJoin" placeholder="ID of town to join, or select from list"
                       value={townIDToJoin}
                       onChange={event => setTownIDToJoin(event.target.value)}/>
              </FormControl>
                <Button data-testid='joinTownByIDButton'
                        onClick={() => handleJoin(townIDToJoin)}>Connect</Button>
              </Flex>

            </Box>

            <Heading p="4" as="h4" size="md">Select a public town to join</Heading>
            <Box maxH="500px" overflowY="scroll">
              <Table>
                <TableCaption placement="bottom">Publicly Listed Towns</TableCaption>
                <Thead><Tr><Th>Room Name</Th><Th>Room ID</Th><Th>Activity</Th></Tr></Thead>
                <Tbody>
                  {currentPublicTowns?.map((town) => (
                    <Tr key={town.coveyTownID}><Td role='cell'>{town.friendlyName}</Td><Td
                      role='cell'>{town.coveyTownID}</Td>
                      <Td role='cell'>{town.currentOccupancy}/{town.maximumOccupancy}
                        <Button onClick={() => handleJoin(town.coveyTownID)}
                                disabled={town.currentOccupancy >= town.maximumOccupancy}>Connect</Button></Td></Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>



          </Box>
        </Stack>
      </form>
    </>
  );
}
