import type { ReactNode } from 'react';
import './style.css';
export const metadata = {title:'FlowForge | Workspace',description:'Business workflow automation'};
export default function RootLayout({children}:{children:ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
