'use client'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { ThemeProvider } from "@/components/theme-provider"
import { customFetch } from '@/lib/utils';
import firebase from "firebase/compat/app";
import { TAuthUser } from '@/lib/types';
import { useRouter } from 'next/navigation';

type TUserContext = {
	user: TAuthUser | null,
	isLoading: boolean,
	login: Function,
	logout: Function
}

const UserContext = createContext<TUserContext>({
	user: null,
	isLoading: true,
	login: () => {},
	logout: () => {}
});

export function Providers({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<TAuthUser | null>(null);
	const [isLoading, setLoading] = useState<boolean>(true);
	const router = useRouter();

    useEffect(() => {
        if (!user) {
            login();
        }
    }, []);

    function login() {
		setLoading(true);
        customFetch({ pathName: 'session' })
            .then((data) => {
                if(data.success) {
					setUser(data.user)
				}
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
            }).finally(() => {
				setLoading(false);
			})
    }

    function logout() {
		customFetch({
			pathName: 'session',
			method: 'DELETE'
		}).then(res => {
			setUser(null);
			router.replace('/auth');
		})
    }

    return (
        <UserContext.Provider value={{ user, login, logout, isLoading }}>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>
        </UserContext.Provider>
    )

}


export function useUser() {
    return useContext(UserContext);
}