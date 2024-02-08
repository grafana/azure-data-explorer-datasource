import React from 'react';
import { Button, Icon, useStyles2 } from "@grafana/ui";
import { v4 as uuidv4 } from 'uuid';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

export const PromptHistory = ({ parsedStoredPrompts, useStoredPrompt, setParsedStoredPrompts, setShowQueryHistory }) => {
    const NO_STORED_PROMPTS_MESSAGE = "No prompts stored in history. When you write a prompt and click generate query, the prompt will be stored here.";
    const styles = useStyles2(getStyles);
    
    const removePrompt = (prompt: string) => {
        const updatedPrompts = parsedStoredPrompts.filter((p) => p !== prompt);
        const stringifiedPrompts = JSON.stringify(updatedPrompts);
        localStorage.setItem("storedOpenAIPrompts", stringifiedPrompts);
        setParsedStoredPrompts(updatedPrompts);
    };

    const useSelectedPrompt = (prompt: string) => {
        useStoredPrompt(prompt);
        setShowQueryHistory(false);
    };
    
    const generatePromptCards = ( ) => {
        if (parsedStoredPrompts.length > 0) {
            return parsedStoredPrompts.map((prompt) => {
                return(
                    <div key={uuidv4()} style={{ border: `1px solid`, padding: '20px', marginTop: '15px', height: '150px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end'}}>
                            <Button
                                // eslint-disable-next-line react-hooks/rules-of-hooks
                                onClick={() => removePrompt(prompt)}
                                icon="trash-alt"
                                aria-label="Remove"
                                size="sm"
                                variant="secondary"
                            />  
                        </div>
                        <div style={{ width: '90%', height: '50%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ margin: '0'}}>{prompt}</div>
                            <Button
                                // eslint-disable-next-line react-hooks/rules-of-hooks
                                onClick={() => useSelectedPrompt(prompt)}
                                variant="secondary"
                                size="sm"
                            >
                                Use this prompt
                            </Button>
                        </div>
                    </div>
                )
            })
        } else { 
            return (  
                <div className={styles.wrapper}>
                    <div className={styles.icon}>
                        <Icon name="exclamation-triangle" />
                    </div>
                    <div className={styles.message}>
                        {NO_STORED_PROMPTS_MESSAGE}
                    </div>
              </div>
            ) 
        };
    };

    return(
        <div>
           {generatePromptCards()}
        </div>
    )
};

const getStyles = (theme: GrafanaTheme2) => ({
    wrapper: css({
      marginTop: theme.spacing(2),
      background: theme.colors.background.secondary,
      display: 'flex',
    }),
    icon: css({
      background: theme.colors.error.main,
      color: theme.colors.error.contrastText,
      padding: theme.spacing(1),
    }),
    message: css({
      fontSize: theme.typography.bodySmall.fontSize,
      fontFamily: theme.typography.fontFamilyMonospace,
      padding: theme.spacing(1),
    }),
  });
