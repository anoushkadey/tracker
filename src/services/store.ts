import { db, isFirebaseConfigured } from './firebase'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Query,
  QueryConstraint,
} from 'firebase/firestore'

// Mock in-memory database
const mockStore: Record<string, any[]> = {}

/**
 * Get all documents from a collection
 */
export async function getAll<T>(collectionName: string): Promise<(T & { id: string })[]> {
  if (isFirebaseConfigured && db) {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName))
      return querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      } as T & { id: string }))
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error)
      return []
    }
  }

  // Mock mode
  return (mockStore[collectionName] || []) as (T & { id: string })[]
}

/**
 * Get a single document by ID
 */
export async function getById<T>(collectionName: string, id: string): Promise<T | null> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, collectionName, id)
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? (docSnap.data() as T) : null
    } catch (error) {
      console.error(`Error fetching ${collectionName}/${id}:`, error)
      return null
    }
  }

  // Mock mode
  const collection_data = mockStore[collectionName] || []
  const found = collection_data.find((item) => item.id === id)
  return found ? (found as T) : null
}

/**
 * Query documents where a field matches a value
 */
export async function getWhere<T>(
  collectionName: string,
  fieldName: string,
  value: any
): Promise<(T & { id: string })[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, collectionName), where(fieldName, '==', value))
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      } as T & { id: string }))
    } catch (error) {
      console.error(`Error querying ${collectionName} where ${fieldName}:`, error)
      return []
    }
  }

  // Mock mode
  const collection_data = mockStore[collectionName] || []
  return collection_data.filter((item) => item[fieldName] === value) as (T & { id: string })[]
}

/**
 * Create or overwrite a document
 */
export async function put<T extends { id: string }>(
  collectionName: string,
  document: T
): Promise<T> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, collectionName, document.id)
      await setDoc(docRef, document)
      return document
    } catch (error) {
      console.error(`Error writing to ${collectionName}/${document.id}:`, error)
      throw error
    }
  }

  // Mock mode
  if (!mockStore[collectionName]) {
    mockStore[collectionName] = []
  }
  const index = mockStore[collectionName].findIndex((item) => item.id === document.id)
  if (index >= 0) {
    mockStore[collectionName][index] = document
  } else {
    mockStore[collectionName].push(document)
  }
  return document
}

/**
 * Update specific fields of a document
 */
export async function update<T extends { id: string }>(
  collectionName: string,
  id: string,
  updates: Partial<T>
): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, collectionName, id)
      await updateDoc(docRef, updates)
    } catch (error) {
      console.error(`Error updating ${collectionName}/${id}:`, error)
      throw error
    }
  }

  // Mock mode
  const collection_data = mockStore[collectionName] || []
  const index = collection_data.findIndex((item) => item.id === id)
  if (index >= 0) {
    mockStore[collectionName][index] = {
      ...mockStore[collectionName][index],
      ...updates,
    }
  }
}

/**
 * Delete a document
 */
export async function remove(collectionName: string, id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, collectionName, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error(`Error deleting ${collectionName}/${id}:`, error)
      throw error
    }
  }

  // Mock mode
  const collection_data = mockStore[collectionName] || []
  const index = collection_data.findIndex((item) => item.id === id)
  if (index >= 0) {
    collection_data.splice(index, 1)
  }
}

/**
 * Seed a collection with data if it's empty
 */
export async function seedIfEmpty<T extends { id: string }>(
  collectionName: string,
  data: T[]
): Promise<void> {
  const existing = await getAll(collectionName)
  if (existing.length === 0) {
    for (const item of data) {
      await put(collectionName, item)
    }
  }
}
