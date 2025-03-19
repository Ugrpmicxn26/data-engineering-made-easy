
import React from "react";

interface ConfigHeaderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const ConfigHeader: React.FC<ConfigHeaderProps> = ({ title, description, icon }) => {
  return (
    <div className="bg-muted/40 p-4 rounded-lg mb-4">
      {icon && (
        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary mb-2">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <p className="text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
};

export default ConfigHeader;
