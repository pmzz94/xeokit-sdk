/**
 A **Model** is a {@link Group} of {@link Component"}}Components{{/crossLink}}.

 Model is an abstract base class that's subclassed by (at least):

 * {@link GLTFModel}, which loads its components from glTF files and supports physically-based materials, if needed for a realistic appearance.
 * {@link OBJModel}, which loads its components from .OBJ and .MTL files and renders using Phong shading.
 * {@link STLModel}, which loads its components from .STL files and renders using Phong shading.
 * {@link SceneJSModel}, which loads its components from SceneJS scene definitions and renders using Phong shading.
 * {@link BuildableModel}, which extends Model with a fluent API for building its components.

 @class Model
 @module xeokit
 @submodule models
 @constructor
 @param [owner] {Component} Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata.
 @param [cfg.entityType] {String} Optional entity classification when using within a semantic data model. See the {@link Object} documentation for usage.
 @param [cfg.parent] {Object} The parent.
 @param [cfg.position=[0,0,0]] {Float32Array} Local 3D position.
 @param [cfg.scale=[1,1,1]] {Float32Array} Local scale.
 @param [cfg.rotation=[0,0,0]] {Float32Array} Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
 @param [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] {Float32Array} Local modelling transform matrix. Overrides the position, scale and rotation parameters.
 @param [cfg.visible=true] {Boolean}        Indicates if visible.
 @param [cfg.culled=false] {Boolean}        Indicates if culled from view.
 @param [cfg.pickable=true] {Boolean}       Indicates if pickable.
 @param [cfg.clippable=true] {Boolean}      Indicates if clippable.
 @param [cfg.collidable=true] {Boolean}     Indicates if included in boundary calculations.
 @param [cfg.castShadow=true] {Boolean}     Indicates if casting shadows.
 @param [cfg.receiveShadow=true] {Boolean}  Indicates if receiving shadows.
 @param [cfg.outlined=false] {Boolean}      Indicates if outline is rendered.
 @param [cfg.ghosted=false] {Boolean}       Indicates if rendered as ghosted.
 @param [cfg.highlighted=false] {Boolean}   Indicates if rendered as highlighted.
 @param [cfg.selected=false] {Boolean}      Indicates if rendered as selected.
 @param [cfg.edges=false] {Boolean}         Indicates if edges are emphasized.
 @param [cfg.aabbVisible=false] {Boolean}   Indicates if axis-aligned World-space bounding box is visible.
 @param [cfg.obbVisible=false] {Boolean}    Indicates if oriented World-space bounding box is visible.
 @param [cfg.colorize=[1.0,1.0,1.0]] {Float32Array}  RGB colorize color, multiplies by the rendered fragment colors.
 @param [cfg.opacity=1.0] {Number} Opacity factor, multiplies by the rendered fragment alpha.
 @extends Group
 */
import {core} from "../core.js";
import {utils} from '../utils.js';
import {Group} from "../objects/Group.js";

class Model extends Group {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "Model";
    }

    /**
     * @private
     */
    get isModel() {
        return true;
    }

    init(cfg) {

        /**
         All contained {@link Components}, mapped to their IDs.

         @property components
         @type {{String:Component}}
         */
        this.components = {};

        /**
         Number of contained {@link Components}.

         @property numComponents
         @type Number
         */
        this.numComponents = 0;

        /**
         A map of maps; for each contained {@link Component} type,
         a map to IDs to {@link Component} instances, eg.

         ````
         "Geometry": {
                "alpha": <xeokit.Geometry>,
                "beta": <xeokit.Geometry>
              },
         "Rotate": {
                "charlie": <xeokit.Rotate>,
                "delta": <xeokit.Rotate>,
                "echo": <xeokit.Rotate>,
              },
         //...
         ````

         @property types
         @type {String:{String:xeokit.Component}}
         */
        this.types = {};

        /**
         All contained {@link Object"}}Objects{{/crossLink}}, mapped to their IDs.

         @property objects
         @final
         @type {{String:Object}}
         */
        this.objects = {};

        /**
         {@link Object"}}Objects{{/crossLink}} in this Model that have GUIDs, mapped to their GUIDs.

         Each Object is registered in this map when its {@link Object/guid} is
         assigned a value.

         @property guidObjects
         @final
         @type {{String:Object}}
         */
        this.guidObjects = {};

        /**
         All contained {@link Mesh"}}Meshes{{/crossLink}}, mapped to their IDs.

         @property meshes
         @final
         @type {String:xeokit.Mesh}
         */
        this.meshes = {};

        /**
         {@link Object"}}Objects{{/crossLink}} in this Model that have entity types, mapped to their IDs.

         Each Object is registered in this map when its {@link Object/entityType} is
         set to value.

         @property entities
         @final
         @type {{String:Object}}
         */
        this.entities = {};

        /**
         For each entity type, a map of IDs to {@link Object"}}Objects{{/crossLink}} of that entity type.

         Each Object is registered in this map when its {@link Object/entityType} is
         assigned a value.

         @property entityTypes
         @final
         @type {String:{String:xeokit.Component}}
         */
        this.entityTypes = {};

        /**
         Lazy-regenerated ID lists.
         */
        this._objectGUIDs = null;
        this._entityIds = null;

        // xeokit.Model overrides xeokit.Group / xeokit.Object state properties, (eg. visible, ghosted etc)
        // and those redefined properties are being set here through the super constructor.

        super.init(cfg); // Call xeokit.Group._init()

        this.scene._modelCreated(this);
    }

    _addComponent(component) {
        let componentId;
        let types;
        if (utils.isNumeric(component) || utils.isString(component)) { // Component ID
            component = this.scene.components[component];
            if (!component) {
                this.warn("Component not found: " + utils.inQuotes(component));
                return;
            }
        } else if (utils.isObject(component)) { // Component config
            const type = component.type || "Component";
            if (!core.isComponentType(type)) {
                this.error("Not a xeokit component type: " + type);
                return;
            }
            component = new window[type](this.scene, component);
        }
        if (component.scene !== this.scene) { // Component in wrong Scene
            this.error("Attempted to add component from different xeokit.Scene: " + utils.inQuotes(component.id));
            return;
        }
        if (this.components[component.id]) { // Component already in this Model
            return;
        }
        if (component.model && component.model.id !== this.id) { // Component in other Model
            component.model._removeComponent(component); // Transferring to this Model
        }
        this.components[component.id] = component;
        types = this.types[component.type];
        if (!types) {
            types = this.types[component.type] = {};
        }
        types[component.id] = component;
        if (component.isObject) {
            const object = component;
            this.objects[object.id] = object;
            if (object.entityType) {
                this.entities[object.id] = object;
                let objectsOfType = this.entityTypes[object.entityType];
                if (!objectsOfType) {
                    objectsOfType = {};
                    this.entityTypes[object.entityType] = objectsOfType;
                }
                objectsOfType[object.id] = object;
                this._entityIds = null; // Lazy regenerate
                this._entityTypeIds = null; // Lazy regenerate
            }
            if (object.guid) {
                this.guidObjects[object.id] = object;
                this._objectGUIDs = null; // To lazy-rebuild
            }
            if (component.isMesh) {
                this.meshes[component.id] = component;
            }
        }
        this.numComponents++;
        component._addedToModel(this);
        return component;
    }

    _removeComponent(component) {
        const id = component.id;
        delete this.components[id];
        delete this.meshes[id];
        delete this.objects[id];
        if (component.entityType) {
            delete this.entities[id];
            const objectsOfType = this.entityTypes[component.entityType];
            if (objectsOfType) {
                delete objectsOfType[id];
            }
            this._entityIds = null; // Lazy regenerate
            this._entityTypeIds = null; // Lazy regenerate
        }
        if (component.guid) {
            delete this.guidObjects[component.guid];
            this._objectGUIDs = null; // To lazy-rebuild
        }
    }

    /**
     Destroys all {@link Component"}}Components{{/crossLink}} in this Model.
     @method clear
     */
    clear() {
        // For efficiency, destroy Meshes first to avoid
        // xeokit's automatic default component substitutions
        for (var id in this.meshes) {
            if (this.meshes.hasOwnProperty(id)) {
                this.meshes[id].destroy();
            }
        }
        for (var id in this.components) {
            if (this.components.hasOwnProperty(id)) {
                this.components[id].destroy(); // Groups in this Model will remove themselves when they're destroyed
            }
        }
        this.components = {};
        this.numComponents = 0;
        this.types = {};
        this.objects = {};
        this.meshes = {};
        this.entities = {};
    }

    /**
     Convenience array of entity type IDs in {@link Model/entityTypes}.
     @property entityTypeIds
     @final
     @type {Array of String}
     */
    get objectGUIDs() {
        if (!this._objectGUIDs) {
            this._objectGUIDs = Object.keys(this.guidObjects);
        }
        return this._objectGUIDs;
    }

    /**
     Convenience array of entity type IDs in {@link Model/entityTypes}.
     @property entityTypeIds
     @final
     @type {Array of String}
     */
    get entityTypeIds() {
        if (!this._entityTypeIds) {
            this._entityTypeIds = Object.keys(this.entityTypes);
        }
        return this._entityTypeIds;
    }

    /**
     Convenience array of IDs in {@link Model/entities}.
     @property entityIds
     @final
     @type {Array of String}
     */
    get entityIds() {
        if (!this._entityIds) {
            this._entityIds = Object.keys(this.entities);
        }
        return this._entityIds;
    }

    /**
     * @deprecated
     */
    destroyAll() {
        this.clear();
    }

    destroy() {
        super.destroy();
        this.clear();
        this.scene._modelDestroyed(this);
    }
}

export {Model};