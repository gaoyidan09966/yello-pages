/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Icons from 'lucide-react';

interface IconProps extends React.ComponentPropsWithoutRef<'svg'> {
  name: string;
  size?: number;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 18, className, ...props }) => {
  // Safe dynamic lookup fallback to a Wrench if not found
  const LucideIcon = (Icons as any)[name];
  
  if (!LucideIcon) {
    return <Icons.HelpCircle size={size} className={className} {...props} />;
  }

  return <LucideIcon size={size} className={className} {...props} />;
};
