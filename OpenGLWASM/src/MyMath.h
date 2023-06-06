#pragma once

typedef struct 
{
	float X, Y, Z;
} Vec3;

typedef struct  {
	float M[4][4];
} Mat4;

void Mat4Init(Mat4* mat, const float s);
void Mat4Identity(Mat4* mat);
float* Mat4ValuePtr(Mat4* mat);
void Mat4Multiply(Mat4* m1, Mat4* m2, Mat4* outResult);
void MatRotate(Mat4* mat, float angle, const Vec3* rotation, Mat4* outResult);