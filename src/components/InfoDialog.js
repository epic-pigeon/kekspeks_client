import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";

export default class InfoDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {open: false, title: "", message: ""};
    }
    displayInfo(title, message) {
        this.setState({open: true, title, message});
    }
    render() {
        return <Dialog open={this.state.open} onClose={() => this.setState({open: false})}>
            <DialogTitle>{this.state.title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{this.state.message}</DialogContentText>
            </DialogContent>
        </Dialog>
    }
}
