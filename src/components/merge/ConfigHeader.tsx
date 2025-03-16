
import React from "react";

interface ConfigHeaderProps {
  title: string;
  description: string;
}

const ConfigHeader: React.FC<ConfigHeaderProps> = ({ title, description }) => {
  return (
    <div className="bg-muted/40 p-4 rounded-lg mb-4">
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <p className="text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
};

export default ConfigHeader;
