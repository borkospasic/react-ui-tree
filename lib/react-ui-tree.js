import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Tree from './tree';
import Node from './node';

export default class UITree extends Component {
    static propTypes = {
        tree: PropTypes.object.isRequired,
        paddingLeft: PropTypes.number,
        renderNode: PropTypes.func.isRequired
    };

    static defaultProps = {
        paddingLeft: 20
    };

    constructor(props) {
        super(props);

        this.state = this.init(props);
    }

    componentWillReceiveProps(nextProps) {
        if (!this._updated) {
            this.setState(this.init(nextProps));
        } else {
            this._updated = false;
        }
    }

    init = props => {
        const tree = new Tree(props.tree);
        tree.isNodeCollapsed = props.isNodeCollapsed;
        tree.renderNode = props.renderNode;
        tree.changeNodeCollapsed = props.changeNodeCollapsed;
        tree.updateNodesPosition();

        return {
            tree: tree,
            dragging: {
                id: null,
                x: null,
                y: null,
                w: null,
                h: null
            }
        };
    };

    getDraggingDom = () => {
        const {tree, dragging} = this.state;

        if (dragging && dragging.id) {
            const draggingIndex = tree.getIndex(dragging.id);
            const draggingStyles = {
                top: dragging.y,
                left: dragging.x,
                width: dragging.w
            };

            return (
                <div className="m-draggable" style={draggingStyles}>
                    <Node
                        tree={tree}
                        index={draggingIndex}
                        paddingLeft={this.props.paddingLeft}
                    />
                </div>
            );
        }

        return null;
    };

    render() {
        const tree = this.state.tree;
        const dragging = this.state.dragging;
        const draggingDom = this.getDraggingDom();

        return (
            <div className="m-tree">
                {draggingDom}
                <Node
                    tree={tree}
                    index={tree.getIndex(1)}
                    key={1}
                    paddingLeft={this.props.paddingLeft}
                    onDragStart={this.dragStart}
                    onCollapse={this.toggleCollapse}
                    dragging={dragging && dragging.id}
                />
            </div>
        );
    }

    dragStart = (id, dom, e) => {
        if (e.button !== 0) return;
        this.dragging = {
            id: id,
            w: dom.offsetWidth,
            h: dom.offsetHeight,
            x: dom.offsetLeft,
            y: dom.offsetTop
        };

        this._startX = dom.offsetLeft;
        this._startY = dom.offsetTop;
        this._offsetX = e.clientX;
        this._offsetY = e.clientY;
        this._start = true;

        window.addEventListener('mousemove', this.drag);
        window.addEventListener('mouseup', this.dragEnd);
    };

    // oh
    drag = e => {
        if (this._start) {
            this.setState({
                dragging: this.dragging
            });
            this._start = false;
        }

        const tree = this.state.tree;
        const dragging = this.state.dragging;
        const paddingLeft = this.props.paddingLeft;
        let newIndex = null;
        let index = tree.getIndex(dragging.id);
        const collapsed = index.node.collapsed;

        const _startX = this._startX;
        const _startY = this._startY;
        const _offsetX = this._offsetX;
        const _offsetY = this._offsetY;

        const pos = {
            x: _startX + e.clientX - _offsetX,
            y: _startY + e.clientY - _offsetY
        };
        dragging.x = pos.x;
        dragging.y = pos.y;

        const diffX = dragging.x - paddingLeft / 2 - (index.left - 2) * paddingLeft;
        const diffY = dragging.y - dragging.h / 2 - (index.top - 2) * dragging.h;

        if (diffX < 0) {
            // left
            if (index.parent && !index.next) {
                newIndex = tree.move(index.id, index.parent, 'after');
            }
        } else if (diffX > paddingLeft) {
            // right
            if (index.prev) {
                const prevNode = tree.getIndex(index.prev).node;
                if (!prevNode.collapsed && !prevNode.leaf) {
                    newIndex = tree.move(index.id, index.prev, 'append');
                }
            }
        }

        if (newIndex) {
            index = newIndex;
            newIndex.node.collapsed = collapsed;
            dragging.id = newIndex.id;
        }

        if (diffY < 0) {
            // up
            const above = tree.getNodeByTop(index.top - 1);
            const parent = tree.getIndex(above.parent);

            if(parent.node.leaf != true) {
                newIndex = tree.move(index.id, above.id, 'before');
            }
            else{
                newIndex = tree.move(index.id, parent.id, 'before');
            }

        } else if (diffY > dragging.h) {
            // down
            if (index.next) {
                const below = tree.getIndex(index.next);
                if (below.children && below.children.length && !below.node.collapsed && !below.node.leaf) {
                    newIndex = tree.move(index.id, index.next, 'prepend');
                } else {
                    const parent = tree.getIndex(below.parent);
                    if(parent.node.leaf != true) {
                        newIndex = tree.move(index.id, index.next, 'after');
                    }
                    else{
                        newIndex = tree.move(index.id, parent.id, 'after');
                    }
                }
            } else {
                const below = tree.getNodeByTop(index.top + index.height);
                if (below && below.parent !== index.id) {
                    if (
                        below.children &&
                        below.children.length &&
                        !below.node.collapsed &&
                        !below.node.leaf
                    ) {
                        newIndex = tree.move(index.id, below.id, 'prepend');
                    } else {
                        const parent = tree.getIndex(below.parent);
                        if(parent.node.leaf != true) {
                            newIndex = tree.move(index.id, below.id, 'after');

                        }
                        else{
                            newIndex = tree.move(index.id, parent.id, 'after');
                        }
                    }
                }
            }
        }

        if (newIndex) {
            newIndex.node.collapsed = collapsed;
            dragging.id = newIndex.id;
        }

        this.setState({
            tree: tree,
            dragging: dragging
        });
    };

    dragEnd = () => {
        this.setState({
            dragging: {
                id: null,
                x: null,
                y: null,
                w: null,
                h: null
            }
        });

        this.change(this.state.tree);
        window.removeEventListener('mousemove', this.drag);
        window.removeEventListener('mouseup', this.dragEnd);
    };

    change = tree => {
        this._updated = true;
        if (this.props.onChange) this.props.onChange(tree.obj);
    };

    toggleCollapse = nodeId => {
        const tree = this.state.tree;
        const index = tree.getIndex(nodeId);
        const node = index.node;
        node.collapsed = !node.collapsed;
        tree.updateNodesPosition();

        this.setState({
            tree: tree
        });

        this.change(tree);
    };
}
