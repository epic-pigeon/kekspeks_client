import React from "react";
import API from "../../api";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import ErrorDialog from "../ErrorDialog";
import InfoDialog from "../InfoDialog";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import {IconButton} from "@mui/material";

export default class Main extends React.Component {
    constructor(props) {
        super(props);
        API.getToken().then(() => {
            API.getGroups(0, 20).then(groups => {
                this.setState({groups});
            }).catch(e => this.errorDialog.current && this.errorDialog.current.displayError(e));
        }).catch(e => window.location = "/login");
        API.getMe().then(me => {
            this.setState({me});
        }).catch(e => this.errorDialog.current && this.errorDialog.current.displayError(e));
        API.getInvitations(0, 5).then(invites => {
            this.setState({invites});
        }).catch(e => this.errorDialog.current && this.errorDialog.current.displayError(e));
        API.pollEventEmitter().on("message", m => {
            if (this.state.messages && this.state.messages[m.groupId] && m.message.fromLogin !== this.state.me.login) {
                this.setState({
                    messages: {
                        ...this.state.messages,
                        [m.groupId]: [m.message, ...this.state.messages[m.groupId]]
                    },
                }, () => {
                    this.messageList.current.scrollTop = this.messageList.current.scrollHeight;
                });
            }
        });
        this.state = {
            me: undefined,
            groups: undefined,
            currentGroup: undefined,
            messages: {},
            newGroupName: "",
            groupButtonDisabled: false,
            newMessage: "",
            messageButtonDisabled: false,
            inviteLogin: "",
            inviteButtonDisabled: false,
            invites: [],
        };
        this.errorDialog = React.createRef();
        this.infoDialog = React.createRef();
        this.messageList = React.createRef();
    }
    groupMembersString(g) {
        let res = g.ownerLogin + " (owner)";
        if (g.memberLogins) for (let login of g.memberLogins) res += ", " + login;
        if (res.length > 60) res = res.substring(0, 57) + "...";
        return res;
    }
    timestampToString(timestamp) {
        let date = new Date(timestamp), now = new Date();
        if (now.getDate() === date.getDate() && now.getMonth() === date.getMonth()
            && now.getFullYear() === date.getFullYear()) {
            return date.toLocaleTimeString("en-US");
        } else {
            return date.toLocaleString("en-US");
        }
    }
    sendMessage() {
        this.setState({messageButtonDisabled: true});
        API.sendMessage(this.state.newMessage, this.state.currentGroup._id)
        .then(m => {
            let g = this.state.currentGroup;
            this.setState({
                messages: {
                    ...this.state.messages,
                    [g._id]: [m, ...this.state.messages[g._id]]
                },
                messageButtonDisabled: false,
                newMessage: '',
            }, () => {
                this.messageList.current.scrollTop = this.messageList.current.scrollHeight;
            });
        }).catch(e => {
            this.setState({messageButtonDisabled: false});
            this.errorDialog.current && this.errorDialog.current.displayError(e);
        });
    }
    selectGroup(g) {
        this.setState({currentGroup: g, newMessage: "", inviteLogin: ""});
        if (!this.state.messages[g._id]){
            API.getMessages(g._id, 0, 50)
                .then(messages => {
                    this.setState({messages: Object.assign(
                        this.state.messages, {[g._id]: messages}
                    )});
                }).catch(e => {
                this.errorDialog.current && this.errorDialog.current.displayError(e)
            });
        }
    }
    render() {
        return <>
            <ErrorDialog ref={this.errorDialog}/>
            <InfoDialog ref={this.infoDialog}/>
            <div style={{width: "100vw", height: "100vh", display: "flex"}}>
                <div style={{width: "40vw", borderRight: "1px solid grey", overflowY: "scroll"}}>{
                    this.state.invites && this.state.invites.length > 0 &&
                        <>
                            <h2 style={{marginLeft: "30px"}}>New invitations</h2>
                            <List>
                                {this.state.invites.map(inv => <>
                                    <ListItem key={inv._id + "l"} disablePadding>
                                        <ListItemButton>
                                            <ListItemText
                                                primary={"Group ID: " + inv.groupId}
                                                secondary={this.timestampToString(inv.createdAt)}
                                            />
                                        </ListItemButton>
                                        <IconButton
                                            style={{margin: "3px"}}
                                            onClick={e => {
                                                API.acceptInvitation(inv)
                                                .then(g => {
                                                    this.setState({
                                                        invites: this.state.invites.filter(i => i.groupId !== inv.groupId),
                                                        groups: [g, ...this.state.groups],
                                                    }, () => this.selectGroup(g));
                                                }).catch(e => {
                                                    this.errorDialog.current &&
                                                        this.errorDialog.current.displayError(e);
                                                })
                                            }}
                                        ><CheckIcon style={{margin: "5px"}} /></IconButton>
                                        <IconButton
                                            style={{margin: "3px", marginRight: "12px"}}
                                            onClick={e => {
                                                API.declineInvitation(inv)
                                                .then(r => {
                                                    this.setState({
                                                        invites: this.state.invites.filter(i => i.groupId !== inv.groupId),
                                                    });
                                                })
                                                .catch(e => {
                                                    this.errorDialog.current &&
                                                    this.errorDialog.current.displayError(e);
                                                })
                                            }}
                                        ><DeleteIcon style={{margin: "5px"}} /></IconButton>
                                    </ListItem>
                                    <Divider key={inv._id + "d"}/>
                                </>)}
                            </List>
                        </>
                }{
                    this.state.groups && this.state.me ?
                        <>
                            <h2 style={{marginLeft: "30px"}}>Groups</h2>
                            <List>
                                {this.state.groups.map((g, i) => <>
                                    <ListItem key={g._id + "l"} disablePadding>
                                        <ListItemButton onClick={e => this.selectGroup(g)}>
                                            <ListItemText
                                                primary={g.name}
                                                secondary={this.groupMembersString(g)}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                    <Divider key={g._id + "d"}/>
                                </>)}
                            </List>
                            <div style={{padding: "10px", display: "flex", justifyContent: "center", alignItems: "center"}}>
                                <TextField label="New group name" variant="outlined" fullWidth value={this.state.newGroupName}
                                    onChange={e => this.setState({newGroupName: e.target.value})}
                                    onKeyPress={e => {
                                        if (e.key === "Enter") this.sendMessage();
                                    }}
                                />
                                <Button
                                    style={{marginLeft: "20px"}}
                                    variant="contained"
                                    value={this.state.newGroupName}
                                    disabled={this.state.groupButtonDisabled}

                                    onClick={e => {
                                        this.setState({groupButtonDisabled: true});
                                        API.createGroup(this.state.newGroupName)
                                        .then(g => {
                                            this.setState({
                                                groups: [g, ...this.state.groups],
                                                currentGroup: g,
                                                messages: {[g._id]: [], ...this.state.messages},
                                                groupButtonDisabled: false,
                                                newGroupName: '',
                                            })
                                        }).catch(e => {
                                            this.setState({groupButtonDisabled: false});
                                            this.errorDialog.current && this.errorDialog.current.displayError(e);
                                        })
                                    }}
                                >Create</Button>
                            </div>
                        </>
                        : "Loading..."
                }</div>
                <div style={{width: "60vw", display: "flex", flexDirection: "column"}}>{
                    this.state.groups ?
                        this.state.currentGroup ?
                            this.state.messages[this.state.currentGroup._id] ?
                                <>
                                    <Accordion style={{padding: "10px 0px"}}>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            {this.state.currentGroup.name}
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            Group ID: {this.state.currentGroup._id}<br />
                                            Members: {this.groupMembersString(this.state.currentGroup)}<br />
                                            {this.state.currentGroup.ownerLogin === this.state.me.login &&
                                            <div style={{padding: "10px", display: "flex", justifyContent: "center", alignItems: "center"}}>
                                                <TextField label="Login" variant="outlined" value={this.state.inviteLogin}
                                                           onChange={e => this.setState({inviteLogin: e.target.value})}
                                                />
                                                <Button
                                                    style={{marginLeft: "20px"}}
                                                    variant="contained"
                                                    disabled={this.state.inviteButtonDisabled}
                                                    onClick={e => {
                                                        this.setState({inviteButtonDisabled: true});
                                                        API.inviteToGroup(this.state.currentGroup._id, this.state.inviteLogin)
                                                        .then(() => {
                                                            this.setState({inviteButtonDisabled: false});
                                                        }).catch(e => {
                                                            this.setState({inviteButtonDisabled: false});
                                                            this.errorDialog.current &&
                                                                this.errorDialog.current.displayError(e);
                                                        });
                                                    }}
                                                >Invite</Button>
                                            </div>}
                                        </AccordionDetails>
                                    </Accordion>
                                    <List ref={this.messageList} style={{overflowY: "scroll", display: "flex", flexDirection: "column-reverse"}}>
                                        {this.state.messages[this.state.currentGroup._id].map(m => <>
                                            <ListItem key={m._id + "l"} disablePadding>
                                                <ListItemButton onClick={e => {
                                                    this.infoDialog.current.displayInfo(
                                                        "Message info",
                                                        <>
                                                            From: {m.fromLogin}<br />
                                                            Decrypted: {m.decrypted + ""}<br />
                                                            {m.decrypted && <>
                                                                Text: {m.text}<br />
                                                                Has signature: {m.hasSignature + ""}<br />
                                                                {m.hasSignature && <>
                                                                    Signature: {btoa(String.fromCharCode(...m.signature))}<br />
                                                                    Verified: {m.verified+""}<br />
                                                                </>}
                                                            </>}
                                                        </>
                                                    );
                                                }}>
                                                    <ListItemText primary={
                                                        m.decrypted ?
                                                            m.hasSignature ?
                                                                m.verified ?
                                                                    m.text
                                                                    : <span color="red">the message is signed but the signature is invalid</span>
                                                                : <span color="red">the message is not signed</span>
                                                            : <span color="red">the message could not be decrypted</span>
                                                    } secondary={
                                                        (m.fromLogin === this.state.me.login ? "you" : m.fromLogin)
                                                        + " at " + this.timestampToString(m.createdAt)
                                                    }/>
                                                </ListItemButton>
                                            </ListItem>
                                            <Divider key={m._id + "d"}/>
                                        </>)}
                                    </List>
                                    <div style={{padding: "10px", marginTop: "auto", display: "flex", justifyContent: "center", alignItems: "center"}}>
                                        <TextField label="Message" variant="outlined" fullWidth value={this.state.newMessage}
                                                   onChange={e => this.setState({newMessage: e.target.value})}
                                                   onKeyDown={e => e.key === "Enter" && this.sendMessage()}
                                        />
                                        <Button
                                            style={{marginLeft: "20px"}}
                                            variant="contained"
                                            disabled={this.state.messageButtonDisabled}
                                            onClick={e => this.sendMessage()}
                                        >Send</Button>
                                    </div>
                                </>
                                : `Loading ${this.state.currentGroup.name}...`
                            : "Select chat to display"
                        : "Loading..."}</div>
            </div>
        </>;
    }
}
