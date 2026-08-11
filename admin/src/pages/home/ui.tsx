import { Box, Field } from '@strapi/design-system';
import type { ReactNode } from 'react';
import styled from 'styled-components';

export const PageShell = styled(Box)`
  max-width: 1240px;
  margin: 0 auto;
`;

export const Panel = styled(Box)`
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const ChannelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(130px, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(130px, 1fr));
  }
`;

export const ChannelCard = styled(Box)`
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: 8px;
`;

export const ConnectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const StatusMessage = styled(Box)<{ $tone: 'success' | 'danger' }>`
  border-radius: 8px;
  border: 1px solid
    ${({ theme, $tone }) =>
      $tone === 'success' ? theme.colors.success200 : theme.colors.danger200};
  background: ${({ theme, $tone }) =>
    $tone === 'success' ? theme.colors.success100 : theme.colors.danger100};
`;

export const fieldId = (name: string) => `notificator-${name}`;

/** Apply Strapi's accessible field labelling consistently to custom controls. */
export const FormField = ({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) => (
  <Field.Root id={id} name={id}>
    <Field.Label>{label}</Field.Label>
    {children}
  </Field.Root>
);
