#include "MyMath.h"

#define M_PI 3.14159265358979323846264338327950288

#include <math.h>
#include <string.h>

void Mat4Init(Mat4* mat, const float s)
{
    mat->M[0][0] = s;
    mat->M[0][1] = 0.0f;
    mat->M[0][2] = 0.0f;
    mat->M[0][3] = 0.0f;

    mat->M[1][0] = 0.0f;
    mat->M[1][1] = s;
    mat->M[1][2] = 0.0f;
    mat->M[1][3] = 0.0f;

    mat->M[2][0] = 0.0f;
    mat->M[2][1] = 0.0f;
    mat->M[2][2] = s;
    mat->M[2][3] = 0.0f;

    mat->M[3][0] = 0.0f;
    mat->M[3][1] = 0.0f;
    mat->M[3][2] = 0.0f;
    mat->M[3][3] = s;
}

void Mat4Identity(Mat4* mat)
{
    Mat4Init(mat, 1.0f);
}

float* Mat4ValuePtr(Mat4* mat)
{
    return &mat->M[0][0];
}

void Mat4Multiply(Mat4* m1, Mat4* m2, Mat4* outResult)
{
    if (outResult == NULL)
        return;

    for (int row = 0; row < 4; row++)
    {
        for (int col = 0; col < 4; col++)
        {
            float sum = 0.0f;
            for (int i = 0; i < 4; i++)
            {
                sum += m1->M[row][i] * m2->M[i][col];
            }
            outResult->M[row][col] = sum;
        }
    }
}

void MatRotate(Mat4* mat, float angle, const Vec3* rotation, Mat4* outResult)
{
    float radian = angle * (float)M_PI / 180.0f;
    float cosAngle = cosf(radian);
    float sinAngle = sinf(radian);
    float oneMinusCos = 1.0f - cosAngle;

    float axisX = rotation->X;
    float axisY = rotation->Y;
    float axisZ = rotation->Z;

    Mat4 result = {
        .M = {
        { cosAngle + (oneMinusCos * axisX * axisX), (oneMinusCos * axisX * axisY) - (sinAngle * axisZ), (oneMinusCos * axisX * axisZ) + (sinAngle * axisY), 0.0f },
        { (oneMinusCos * axisY * axisX) + (sinAngle * axisZ), cosAngle + (oneMinusCos * axisY * axisY), (oneMinusCos * axisY * axisZ) - (sinAngle * axisX), 0.0f },
        { (oneMinusCos * axisZ * axisX) - (sinAngle * axisY), (oneMinusCos * axisZ * axisY) + (sinAngle * axisX), cosAngle + (oneMinusCos * axisZ * axisZ), 0.0f },
        { 0.0f, 0.0f, 0.0f, 1.0f }
	}};

    Mat4Multiply(mat, &result, outResult);
}
