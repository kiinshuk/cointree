import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc,
  getDoc,
  onSnapshot 
} from 'firebase/firestore';
import { AuthContext } from './AuthContext';

const GroupContext = createContext();

export const useGroups = () => useContext(GroupContext);

export const GroupProvider = ({ children }) => {
  const { userProfile } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsList);
      setLoading(false);
    }, (error) => {
      console.log('Error fetching groups:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  const createGroup = async (name, memberIds = []) => {
    try {
      const members = [...new Set([userProfile.uid, ...memberIds])];
      const groupDoc = await addDoc(collection(db, 'groups'), {
        name,
        memberIds: members,
        createdBy: userProfile.uid,
        createdAt: new Date().toISOString(),
        members: [{
          uid: userProfile.uid,
          name: userProfile.name,
          email: userProfile.email
        }]
      });
      return { success: true, groupId: groupDoc.id };
    } catch (error) {
      console.log('Error creating group:', error);
      return { success: false, error: error.message };
    }
  };

  const getGroupDetails = async (groupId) => {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        return { id: groupDoc.id, ...groupDoc.data() };
      }
      return null;
    } catch (error) {
      console.log('Error getting group:', error);
      return null;
    }
  };

  const value = {
    groups,
    loading,
    createGroup,
    getGroupDetails
  };

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  );
};