import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";

export default class ErrorDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {open: false, message: ""};
    }
    displayError(e) {
        this.setState({open: true, message: e.message});
    }
    render() {
        return <Dialog open={this.state.open} onClose={() => this.setState({open: false})}>
            <DialogTitle>Error</DialogTitle>
            <DialogContent>
                <DialogContentText>{this.state.message}</DialogContentText>
            </DialogContent>
        </Dialog>
    }
}
