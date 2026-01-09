import { createContext } from 'react';
import { ShowContextType } from './types';

export const ShowContext = createContext<ShowContextType | undefined>(undefined);
