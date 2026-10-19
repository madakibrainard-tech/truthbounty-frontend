'use client';

import React from 'react';
import { ConnectButton as RainbowKitConnectButton } from '@rainbow-me/rainbowkit';
import styles from './style.module.css';

export interface ConnectButtonProps {
  label?: string;
  isHigher?: boolean;
  onClick?: () => void;
}

export function ConnectButton({
  label = 'Connect Wallet',
  isHigher,
  onClick,
}: ConnectButtonProps) {
  return (
    <RainbowKitConnectButton.Custom>
      {({
        account,
        chain,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none' as const,
              },
            })}
          >
            {!connected ? (
              <button
                type="button"
                className={styles.button}
                style={{ height: isHigher ? 50 : 38 }}
                onClick={onClick ?? openConnectModal}
                aria-label={label}
              >
                {label}
              </button>
            ) : (
              <RainbowKitConnectButton />
            )}
          </div>
        );
      }}
    </RainbowKitConnectButton.Custom>
  );
}

export default ConnectButton;
