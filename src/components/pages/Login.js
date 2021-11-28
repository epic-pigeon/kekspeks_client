import React from 'react';
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import API from "../../api";
import ErrorDialog from "../ErrorDialog";

export default class Login extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            login: "",
            password: "",
            files: undefined,
        }
        this.errorDialog = React.createRef();
    }

    render() {
        return <Box style={{display: "flex", justifyContent: "center", alignItems: "center", marginTop: "50px"}}>
            <Paper elevation={3} style={{padding: "30px", width: "400px"}}>
                <TextField label="Login" variant="outlined" fullWidth
                    onChange={e => this.setState({login: e.target.value})}
                />
                <TextField label="Password" type="password"
                           variant="outlined" fullWidth style={{marginTop: "20px"}}
                           onChange={e => this.setState({password: e.target.value})}
                />
                {API.hasKeys() ? <><Button
                     variant="contained"
                     style={{marginTop: "20px"}}
                     onClick={async e => {
                         await API.removeKeys();
                         window.location.reload();
                     }}
                >Download and delete keys</Button><br /></>  : <><Button
                    variant="contained"
                    component="label"
                    style={{marginTop: "20px"}}
                >
                    Upload keys
                    <input
                        type="file"
                        hidden
                        onChange={e => this.setState({files: e.target.files})}
                    />
                </Button><br /></>}
                <Button variant="contained" style={{marginTop: "20px"}}
                    onClick={async () => {
                        try {
                            let json = undefined;
                            if (this.state.files && this.state.files.length > 0) {
                                json = await new Promise(resolve => {
                                    let reader = new FileReader();
                                    reader.onload = e => {
                                        resolve(e.target.result);
                                    }
                                    reader.readAsText(this.state.files[0]);
                                });
                            }
                            await API.login(this.state.login, this.state.password, json);
                            window.location = "/";
                        } catch (e) {
                            this.errorDialog.current.displayError(e);
                        }
                    }}
                >Log in</Button>
            </Paper>
            <ErrorDialog ref={this.errorDialog}/>
        </Box>;
    }
}
