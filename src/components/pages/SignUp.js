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
            passwordVerification: "",
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
                <TextField label="Retype password" type="password"
                           variant="outlined" fullWidth style={{marginTop: "20px"}}
                           onChange={e => this.setState({passwordVerification: e.target.value})}
                />
                <Button variant="contained" style={{marginTop: "20px"}}
                        onClick={async () => {
                            try {
                                if (this.state.passwordVerification !== this.state.password) {
                                    throw new Error("Passwords don't coincide");
                                }
                                await API.signUp(this.state.login, this.state.password);
                                window.location = "/";
                            } catch (e) {
                                this.errorDialog.current.displayError(e);
                            }
                        }}
                >Sign up</Button>
            </Paper>
            <ErrorDialog ref={this.errorDialog}/>
        </Box>;
    }
}
