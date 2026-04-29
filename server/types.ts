export interface Vector3Data {
    x: number;
    y: number;
    z: number;
}

export interface QuaternionData {
    x: number;
    y: number;
    z: number;
    w: number;
}

export interface PlayerUserData {
    position: Vector3Data;
    quaternion: QuaternionData;
    animation: string;
    name: string;
    avatarSkin: string;
}

export interface PlayerUpdatePayload {
    position: Vector3Data;
    quaternion: number[];
    animation: string;
    avatarSkin: string;
}

export interface PlayerBroadcastData {
    id: string;
    name: string;
    position_x: number;
    position_y: number;
    position_z: number;
    quaternion_x: number;
    quaternion_y: number;
    quaternion_z: number;
    quaternion_w: number;
    animation: string;
    avatarSkin: string;
}

export interface ChatUserData {
    name: string;
}
