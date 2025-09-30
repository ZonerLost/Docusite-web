import { GetServerSideProps } from 'next';

export default function Home() {
  // This component will never render due to server-side redirect
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/login',
      permanent: false,
    },
  };
};
